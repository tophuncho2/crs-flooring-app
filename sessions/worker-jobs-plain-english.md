# WOMI cut-log workers — what each one does (plain English)

Three flows touch cut logs from the WOMI section. Two are async (BullMQ workers), one is sync (no worker). Below is what each one does in order, in the **target state** after the step-2 fixes land. Items marked 🔧 are changes from today.

---

## 1. Pending Cut Log Worker — when the user clicks "Save Pending Cuts"

User action: Adds drafts, edits existing pending rows, or marks pending rows for delete on the WOMI's expandable cut-log section, then hits Save.

### What happens

1. **Producer (synchronous, in the API request)**
   - [ ] Check the WOMI exists and belongs to the work order in the URL.
   - [ ] Check the WOMI is currently `IDLE` (not already saving / finalizing / failed).
   - [ ] Flip the WOMI status to `SAVING_CUTS`.
   - [ ] Stamp every new draft with a fresh UUID (so the worker can be retried safely — same id, no duplicate).
   - [ ] Write an outbox event with the diff (creates / updates / deletes) and return 202 to the browser.
   - [ ] Done. Worker takes over from here.

2. **Worker (async, picked off the BullMQ queue)** — wraps everything below in a single DB transaction:
   - [ ] Figure out which inventory rows are touched. Sources: the inventory each new draft targets, plus the inventory of any existing cut log being updated or deleted.
   - [ ] Lock those inventory rows `FOR UPDATE` in sorted order. Prevents two concurrent saves from racing on the same inventory.
   - [ ] 🔧 For each delete: re-read the cut log under the lock and confirm it's still `PENDING`. **Final cuts can't be deleted** — they can only be voided. If a delete targets a final row, throw and roll back.
   - [ ] Run the deletes.
   - [ ] 🔧 For each new draft: read the parent inventory's `coveragePerUnit` and category. If the category supports coverage and `coveragePerUnit` is set, derive `coverageCut = cut × coveragePerUnit`. Otherwise leave `coverageCut = null`.
   - [ ] 🔧 Write each draft with: `cut`, `coverageCut` (derived or null), `isWaste`, `notes`, the workOrder/WOMI linkage. **Leave `before`, `after`, `cost`, `freight`, `finalCutSequence` all null.** Status stays `PENDING`, `isFinal` stays false. The `cutLogNumber` is auto-allocated by the DB sequence.
   - [ ] 🔧 For each update: write the patch (`cut`, `isWaste`, `notes`). If `cut` changed, **re-derive `coverageCut`** from the inventory's coverage settings.
   - [ ] Recompute each touched inventory's `totalCutSum` from the non-void cut log set (pending + final, excluding voided), and write it back.
   - [ ] Assert `totalCutSum ≤ startingStock` for each touched inventory. If violated → throw, roll back, mark WOMI `FAILED`.
   - [ ] Flip WOMI status back to `IDLE`.
   - [ ] Commit transaction. Done.

### What this worker does NOT touch

- `before` / `after` (those are stamped at finalize time only)
- `cost` / `freight` (never touched on the WO side)
- `finalCutSequence` (stays null until finalize)
- `isFinal` (stays false until finalize)
- `void` flag (never set here — voiding is its own flow)

---

## 2. Finalize Cut Log Worker — when the user clicks "Finalize Selection"

User action: Selects one or more pending cut log rows on the WOMI's expandable section (selection can span multiple WOMIs and multiple inventories under the same work order), then hits Finalize.

### What happens

1. **Producer (synchronous, in the API request)**
   - [ ] Read every selected cut log.
   - [ ] Reject the whole request if any row doesn't belong to the current work order, isn't currently `PENDING`, is voided, or otherwise fails the finalizability rule. Surface a list of blockers if multiple fail.
   - [ ] Figure out the unique set of WOMIs touched by the selection.
   - [ ] Check each touched WOMI is `IDLE`.
   - [ ] Flip every touched WOMI to `FINALIZING`.
   - [ ] Write an outbox event with the cut log id list and return 202 to the browser.
   - [ ] Done.

2. **Worker (async)** — single DB transaction:
   - [ ] Figure out which inventory rows are touched (look up each selected cut log's `inventoryId`).
   - [ ] Lock those inventory rows `FOR UPDATE` in sorted order.
   - [ ] Re-read every selected cut log under the lock. Re-validate finalizability — catches anything that drifted between producer time and now (e.g. someone voided a row in between).
   - [ ] One batched read for all touched inventories: every cut log on those inventories, regardless of status (PENDING / FINAL / voided), selecting `{id, inventoryId, cut, createdAt, isFinal, finalCutSequence, void}`, ordered by `inventoryId asc, createdAt asc`. This single read powers both the chronological walk and the sequence allocation below.
   - [ ] 🔧 For each touched inventory, run the chronological walk:
     - [ ] Starting `finalCutSequence`: the max `finalCutSequence` over rows with `isFinal: true` for this inventory, **including voided-after-finalized rows** (they keep their sequence). Add 1 — that's `nextSequence` for this batch.
     - [ ] Walk all non-void cut logs for this inventory in `createdAt asc` order, maintaining `balance` starting at `inventory.startingStock`:
       - For each row in order, compute `entering = balance`, `leaving = balance - row.cut`.
       - **If the row is in this finalize batch:** stamp it. Update `status = FINAL`, `isFinal = true`, `finalCutSequence = nextSequence`, `before = entering`, `after = leaving`. `cut`, `coverageCut`, `notes`, `isWaste` stay as the user saved them. Advance `nextSequence += 1`.
       - **If the row is NOT in this batch** (existing FINAL, or other PENDING that aren't being finalized right now): don't update anything — just advance `balance = leaving` and continue.
     - **Voided rows.** Their `cut = 0`, so they don't shift the balance. They can be skipped in the walk (or walked through with a 0 deduction — same outcome).
   - [ ] Defensive check per stamped row: `before − cut === after` (within float tolerance). Throw if not — TX rolls back.
   - [ ] 🔧 **Don't recompute `totalCutSum`.** Cut values didn't change at finalize, so the sum is identical pre/post. Don't re-assert the `≤ startingStock` invariant either, for the same reason. Both are no-ops here.
   - [ ] Flip each touched WOMI back to `IDLE`.
   - [ ] Commit transaction. Done.

### Worked example — what this means

Inventory has `startingStock = 100`. Three cut logs, all pending, in createdAt order: **A** (cut 10), **B** (cut 20), **C** (cut 30). `totalCutSum = 60`, `stockBalance = 40`.

User finalizes **only B** in this batch:
- Walk: A first (skip — not in batch). Balance: 100 → 90. A stays pending.
- B (in batch): entering = 90, leaving = 70. **Stamp B: `before = 90`, `after = 70`, `finalCutSequence = 1` (assuming no prior FINAL on this inventory).**
- C (skip — not in batch). Balance: 70 → 40. C stays pending.
- `totalCutSum` is still 60. `stockBalance` is still 40. Nothing changed there.

User later finalizes **A**:
- Walk: A (in batch): entering = 100, leaving = 90. **Stamp A: `before = 100`, `after = 90`, `finalCutSequence = 2`** (max existing sequence is B's 1; A gets next = 2).
- B (skip — already FINAL). Balance: 90 → 70.
- C (skip — still pending). Balance: 70 → 40.

Notice: **B's stamped `before`/`after` stay 90/70** even after A finalizes later. The values are a snapshot at B's moment-of-finalize. That's the "history" semantic.

### What this worker does NOT touch

- `cut` value (the user set it during pending; it's frozen now)
- `coverageCut` (frozen — set during pending)
- `cost` / `freight` (never touched on the WO side)
- `notes` / `isWaste` (frozen)
- `totalCutSum` on the inventory (no change, see above)
- `void` flag (never voids here)
- The cut log row's `cutLogNumber` (set at creation, immutable for the row's life)

---

## 3. Voiding a Cut Log — synchronous, no worker

User action: Clicks the void action on a single cut log row (final or pending). One row at a time — no batch void.

### What happens

This runs inline in the API request — no outbox, no BullMQ queue, no worker. Single DB transaction:

- [ ] Read the cut log. Check it belongs to the current work order, and that it's actually voidable (not already voided, exists, etc.).
- [ ] Lock the cut log's parent inventory row `FOR UPDATE` (single row — no need for the batch locker).
- [ ] Apply the void patch:
  - `cut` → `"0"` (column is `NOT NULL` — zero is the void marker)
  - `coverageCut` → `null`
  - `cost` → `null`
  - `freight` → `null`
  - `void` → `true`
  - `status` → `VOID`
- [ ] **Preserve everything else** — `before`, `after`, `cutLogNumber`, `isFinal`, `finalCutSequence`, `isWaste`, `notes`, `workOrderId`, `workOrderItemId` all stay. The row remains as a void marker for audit history.
- [ ] Recompute the inventory's `totalCutSum` (the voided cut now contributes 0 to the sum).
- [ ] Assert the `totalCutSum ≤ startingStock` invariant.
- [ ] Commit. Done.

WOMI status is **not touched** by void — voiding doesn't take the WOMI in or out of any in-flight state.

### What void preserves vs. clears

| Column | Before void | After void |
|---|---|---|
| `cut` | user value | `"0"` |
| `coverageCut` | derived value or null | `null` |
| `cost` | always null on WO-side rows | `null` |
| `freight` | always null on WO-side rows | `null` |
| `before` | null (pending) or stamped (final) | unchanged |
| `after` | null (pending) or stamped (final) | unchanged |
| `cutLogNumber` | `CUT-NNNNNNN` | unchanged (history) |
| `isFinal` | true or false | unchanged |
| `finalCutSequence` | int (final) or null (pending) | unchanged |
| `isWaste`, `notes` | user values | unchanged |
| `void` | `false` | `true` |
| `status` | `PENDING` or `FINAL` | `VOID` |

---

## Locking summary

| What | Locked by |
|---|---|
| Inventory rows | Explicit `SELECT ... FOR UPDATE` in sorted order at the start of every consumer (pending worker, finalize worker, void). Prevents concurrent batches from racing on overlapping inventories. |
| WOMI rows | **No explicit lock.** The WOMI's `status` field is the mutex. The producer's `assertWorkOrderItemStatusTransition` enforces the legal state graph (`IDLE → SAVING_CUTS`, `IDLE → FINALIZING`, etc.). A racing second request finds the WOMI already busy and fails the transition with a 409 before any write happens. The Postgres row-level lock during UPDATE prevents two concurrent status writes from both succeeding. |

---

## Questions

1. **Pending worker — delete-final guard placement.** Recommend the consumer (under the lock) over the producer, because the lock guarantees no race between the check and the delete. Confirm?

2. **Finalize worker — chronological walk semantics.** Re-stating to be explicit: at finalize time, `before`/`after` are stamped from a chronological walk through **all non-void cut logs** for the inventory (pending + final), in `createdAt asc` order. Once stamped, the row's `before`/`after` are frozen — they don't shift if other (older) pending cuts later finalize or change. Confirm that's the intended "history" semantic.

3. **Finalize worker — ordering tiebreaker.** If two cuts in the same inventory have the *exact same* `createdAt` timestamp, the chronological walk order is undefined. In practice impossible (each save lands at a different microsecond) but theoretically — do you want a tiebreaker like `cutLogNumber asc` after `createdAt asc`? Or accept that "shouldn't happen"?

4. **Finalize worker — partial-stamping under failure.** If we stamp 3 of 5 cuts in an inventory and then the 4th throws (e.g., invariant check fails), the whole TX rolls back — no row gets `finalCutSequence`, no `before`/`after` stamped, and every touched WOMI flips to `FAILED`. The user retries the whole batch. Confirm that's the intended UX (vs. partial finalize).

5. **Void — should the row's `before` / `after` be cleared too?** Today they're preserved as audit history. Once the new model lands, voiding a *pending* row leaves them null (they were never stamped). Voiding a *final* row leaves them populated (the final-time snapshot). That asymmetry feels right but worth confirming.

6. **Voiding a finalized cut log — does it shift other rows' `before`/`after`?** Currently no (stamped values are frozen). But voiding zeroes the cut, which means if you re-walked the chronological history *now*, downstream rows would see different running balances. Their stamped `before`/`after` would no longer match a fresh walk. Treating stamped values as historical snapshots (which is what we just locked in) means we accept this drift — the row's stamped values reflect "the moment of finalize," not "the always-current chronological position." Confirm.

7. **WOMI status — explicit FOR UPDATE never?** Reading the code, the status-as-mutex pattern works correctly for the current set of transitions. If at some point two different workers could legitimately need the same WOMI's status field at the same time (not the case today), an explicit lock would matter. Today: no need. Confirming you're OK leaving it that way.

8. **Coverage gating — verifying my read of the data.** All four coverage-supporting categories are `vinyl-plank`, `carpet-tile`, `covebase`, `pad`. Any other category → `coverageCut = null` always. Confirming this list is current and complete.
