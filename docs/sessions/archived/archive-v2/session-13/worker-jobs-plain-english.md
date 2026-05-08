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
   - [ ] 🔧 For each touched inventory, allocate sequences and stamp `before`/`after`. **Pending cuts are not part of this computation** — they have no before/after and no sequence until they themselves get finalized.
     - [ ] Read every existing FINAL non-void cut log on this inventory: their `cut` value. Sum them → `existingFinalCutSum`.
     - [ ] Read the max `finalCutSequence` for this inventory across rows with `isFinal: true` — **including voided-after-finalized rows** (they keep their sequence). Call it `maxExistingSequence`. The first sequence to allocate is `maxExistingSequence + 1`.
     - [ ] Initialize: `runningBalance = startingStock - existingFinalCutSum`; `nextSequence = maxExistingSequence + 1`.
     - [ ] Sort this batch's cuts (for this inventory) by `createdAt asc` — gives a stable, deterministic order for sequence allocation within the batch.
     - [ ] For each cut in order:
       - `before = runningBalance`
       - `after = before - cut`
       - Update the row: `status = FINAL`, `isFinal = true`, `finalCutSequence = nextSequence`, `before`, `after`. `cut`, `coverageCut`, `notes`, `isWaste` stay as the user saved them.
       - Defensive check: `before − cut === after` (within float tolerance). Throw if not.
       - Advance: `runningBalance = after`, `nextSequence += 1`.
   - [ ] 🔧 **Don't recompute `totalCutSum`.** Cut values didn't change at finalize, so the sum is identical pre/post. Don't re-assert the `≤ startingStock` invariant either, for the same reason. Both are no-ops here.
   - [ ] Flip each touched WOMI back to `IDLE`.
   - [ ] Commit transaction. Done.

### Two distinct sums to keep straight

| Sum | Formula | Includes | Used for |
|---|---|---|---|
| `inventory.totalCutSum` (persisted on the row) | `sum(non-void cuts)` | All non-void cuts: PENDING + FINAL | The displayed `stockBalance = startingStock − totalCutSum` shows "what's available right now" to the user |
| Finalize worker's `existingFinalCutSum` (in-memory only) | `sum(FINAL non-void cuts)` | **Only** FINAL non-void cuts | Drives `runningBalance = startingStock − existingFinalCutSum` for stamping `before`/`after` on the cuts in this finalize batch |

These are not the same number. The first includes pending; the second excludes pending. Pending cuts contribute to the user's "available" view but never to a cut log's stamped `before`/`after`.

### Worked example

Inventory: `startingStock = 100`. Three cut logs, all PENDING in createdAt order: **A** (cut=10), **B** (cut=20), **C** (cut=30).

**State now (everything pending):**
- `totalCutSum = 60`, `stockBalance = 40` — what the user sees.
- A, B, C: `before = null`, `after = null`, `finalCutSequence = null`. Inert.

**User finalizes only B.**
- `existingFinalCutSum = 0` (no FINAL on this inventory yet).
- `maxExistingSequence = 0`, so `nextSequence = 1`.
- `runningBalance = 100 - 0 = 100`.
- Walk batch (just B): `before = 100`, `after = 80`. Stamped: B = `(100, 80, seq 1)`.
- After: A pending (null/null/null), B FINAL `(100, 80, seq 1)`, C pending.
- `totalCutSum` still `60` (no cut value changed). `stockBalance` still `40`.

**Later, user finalizes A.**
- `existingFinalCutSum = 20` (just B's cut now).
- `maxExistingSequence = 1`, so `nextSequence = 2`.
- `runningBalance = 100 - 20 = 80`.
- Walk batch (just A): `before = 80`, `after = 70`. Stamped: A = `(80, 70, seq 2)`.
- After: A FINAL `(80, 70, seq 2)`, B FINAL `(100, 80, seq 1)` unchanged, C still pending.

**Notice the order of finalization, not creation, drives the sequence and the running balance.** A was created before B but finalized after — A gets sequence 2 with `before = 80` (post-B's deduction), while B keeps its frozen `(100, 80, seq 1)`.

**User then voids A.**
- A patch: `cut → "0"`, `coverageCut → null`, `void → true`, `status → "VOID"`. `finalCutSequence`, `isFinal`, `before`, `after` preserved.
- Recompute `totalCutSum`: `0 + 20 + 30 = 50`. `stockBalance = 50`.
- B unchanged.

**User then finalizes C.**
- `existingFinalCutSum = 0 + 20 = 20` (A voided contributes 0; B contributes 20).
- `maxExistingSequence = 2` (A's — voided rows still have `isFinal: true` so they match). `nextSequence = 3`.
- `runningBalance = 100 - 20 = 80`.
- C stamped: `before = 80`, `after = 50`, `finalCutSequence = 3`.
- After: `totalCutSum = 50`, `stockBalance = 50` — matches C's stamped `after`. The two views align at the moment of finalize because there are no other pending cuts.

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
- Agreed

2. **Finalize worker — within-batch ordering.** Each cut in a finalize batch needs both a `finalCutSequence` and a `before`/`after`. The natural order to assign them is `createdAt asc` — the order the user saved them — even though `createdAt` is "irrelevant" for pending cuts in every other respect. (We have to pick *some* deterministic order within the batch; createdAt is the only stable per-row signal we have, and matches `cutLogNumber asc`.) Confirm or pick a different tiebreaker.
- we should probably use the sequence number to determine then next sequence order #.
- Or are you asking which order the worker should actually make the cuts. If thats the question, my guess would be that it doesn't. matter because if any cut fails it rolls back right? 

3. **Finalize worker — partial-stamping under failure.** If we stamp 3 of 5 cuts in an inventory and then the 4th throws (e.g., invariant check fails), the whole TX rolls back — no row gets stamped, every touched WOMI flips to `FAILED`. The user retries the whole batch. Confirm that's the intended UX (vs. partial finalize).
- Agreed.

4. **Voiding a finalized cut log — `before`/`after` preserved on the voided row.** `buildVoidedCutLogPatch` only clears `cut`/`coverageCut`/`cost`/`freight` and flips `void`/`status`. It preserves `before`, `after`, `cutLogNumber`, `isFinal`, `finalCutSequence` as a historical record. The voided row's `before`/`after` are therefore frozen at the moment-of-finalize snapshot, not "the always-current chronological position." Confirm — this is what `buildVoidedCutLogPatch` already does today.
- put this on hokd

5. **Voiding a finalized cut — does it affect other FINAL rows' stamped `before`/`after`?** No, by the new model. Each FINAL row's `before`/`after` are stamped at the moment of *its own* finalize. Voiding cut A doesn't re-stamp cut B's history. The `existingFinalCutSum` for *future* finalizes will correctly exclude A's voided cut (because `cut = 0` after void), but already-stamped rows stay frozen. Confirm.
- agreed

6. **WOMI status — explicit FOR UPDATE never?** Reading the code, the status-as-mutex pattern works correctly for the current set of transitions. The producer's `assertWorkOrderItemStatusTransition` + the row-level lock during UPDATE make a separate `SELECT ... FOR UPDATE` redundant. Confirming you're OK leaving WOMI rows without an explicit FOR UPDATE.
- put this on hold so i can research,

7. **Coverage gating — verifying my read of the data.** The four coverage-supporting categories are `vinyl-plank`, `carpet-tile`, `covebase`, `pad`. Any other category → `coverageCut = null` always. Confirming this list is current and complete.
 - inventory rows outside of those four categories will never have a coverage per unit in the inv row OR in the product row. so the cut doesn't necessarily need to know the category, so my guess would be it computes no matter what, but most inventory rows will have a null coverage per unit, therefore the coverage cut is null.
