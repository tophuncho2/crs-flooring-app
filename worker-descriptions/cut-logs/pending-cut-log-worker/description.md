# Pending Cut Log Worker

The async job that persists user edits to the pending-cut-log set on a single WOMI (work order material item). One job per WOMI per Save click. Multiple WOMIs save in parallel — each WOMI runs through its own job.

This file is the canonical description of what the worker is supposed to do in the **target (post-hardening) state**. Scope is hard: this worker only. Finalize worker and void flow are documented separately.

---

## Trigger

User opens a WOMI's expandable cut-log section, edits it (adds drafts, edits existing pending rows, or marks pending rows for delete), and clicks **Save Pending Cuts**. The browser sends one PATCH per dirty WOMI in parallel. Each PATCH carries a diff: `{ added[], modified[], deleted[] }`.

---

## Path

| # | Layer | What |
|---|---|---|
| 1 | UI controller | Builds the diff for each dirty WOMI and POSTs |
| 2 | API route | `PATCH /api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/section` |
| 3 | Producer use case | Inside one TX: validates the WOMI, transitions its status `IDLE → SAVING_CUTS`, stamps fresh UUIDs on every draft, writes an outbox event with the diff, returns 202 |
| 4 | Outbox row | `topic = flooring.work-order-item.pending-cut-log.save`, `idempotencyKey = wo-pcl-diff:<womiId>:<requestKey>` |
| 5 | Relay | Polls outbox, dispatches to BullMQ |
| 6 | Worker queue | `flooring-work-order-item-pending-cut-log-diff`, concurrency 1 |
| 7 | Worker processor | Calls the consumer use case; on throw marks the WOMI `FAILED` in a fresh TX before re-throwing for BullMQ retry/unrecoverable classification |
| 8 | Consumer use case | Single TX: locks touched inventories, applies the diff, recomputes `totalCutSum`, asserts the invariant, flips WOMI back to `IDLE` |

---

## Producer (synchronous, in the API request)

Runs in one DB transaction:

- [ ] Look up the WOMI. Reject if it doesn't exist or doesn't belong to the work order in the URL.
- [ ] Check the WOMI's `status` is `IDLE`. If it's `SAVING_CUTS`, `FINALIZING`, or `FAILED`, reject the request (409).
- [ ] Stamp every entry in `added[]` with a fresh server-generated UUID (the draft `id`). The UUID is stable across retries — if the worker re-runs, `createMany` is idempotent on the PK.
- [ ] Update the WOMI status: `IDLE → SAVING_CUTS`.
- [ ] Write an outbox event carrying the diff (with stamped draft ids), the WOMI/work-order linkage, the user identity, and the client-supplied `requestKey` (folded into the idempotency key).
- [ ] Return `202 Accepted` to the browser. Producer is done.

---

## Worker (async, picked off BullMQ)

Wraps everything below in a single DB transaction:

### 1. Determine which inventories to lock

- [ ] From the diff, collect the set of inventory ids:
  - Each entry in `added[]` carries an `inventoryId` (drafts target an inventory directly).
  - Each entry in `modified[]` and `deleted[]` carries a cut log `id`. Look up each row's `inventoryId` to add to the set.
- [ ] Sort the set ascending. This is the lock-acquisition order.

### 2. Lock the touched inventories `FOR UPDATE`

- [ ] For each inventory id in sorted order, run `SELECT "id" FROM "flooring_inventory" WHERE "id" = $id FOR UPDATE`. (Same single-id pattern used everywhere else; sorting prevents deadlocks across overlapping concurrent batches.)

### 3. Pre-validate deletes (close the FINAL-delete gap)

- [ ] For every entry in `deleted[]`, re-read the cut log under the lock and confirm `status = "PENDING"` (and not voided, not finalized).
- [ ] If any delete targets a `FINAL`, `VOID`, or `QUEUED` row → throw and roll back. Final cuts can only be voided, never deleted.

### 4. Apply deletes

- [ ] Run `flooringCutLog.deleteMany({ where: { id: { in: deletedIds } } })`.

### 5. Read coverage data for every touched inventory

Need this for both creates and `cut`-changing updates.

- [ ] Read `{ id, categorySlug, coveragePerUnit }` for every inventory id in the lock set. Build a `Map<inventoryId, { categorySlug, coveragePerUnit }>`.

### 6. Apply creates

For each entry in `added[]`:

- [ ] Look up the entry's inventory in the coverage map.
- [ ] Compute `coverageCut`:
  - If the inventory's category is in the coverage-supporting set (`vinyl-plank`, `carpet-tile`, `covebase`, `pad`) **and** `coveragePerUnit` is non-null → `coverageCut = cut × coveragePerUnit` (using the existing `computeCutCoverage` domain helper).
  - Otherwise → `coverageCut = null`.
- [ ] Build the create row:
  - `id` = the producer-stamped UUID
  - `inventoryId`, `workOrderId`, `workOrderItemId` = from the payload
  - `cut` = user value
  - `coverageCut` = derived above
  - `isWaste`, `notes` = user values
  - **`before` = null, `after` = null** (stamped by finalize worker, not here)
  - **`finalCutSequence` = null** (allocated by finalize worker)
  - **`cost` = null, `freight` = null** (never written on the WO side)
  - `status` = `"PENDING"`, `isFinal` = `false`, `void` = `false`
  - `cutLogNumber` is **not** explicitly set — the DB sequence default `('CUT-' || lpad(nextval(...), 7, '0'))` allocates it
- [ ] Run a single `flooringCutLog.createMany({ data: [...] })` with all the build rows.

### 7. Apply updates

For each entry in `modified[]`:

- [ ] Build the patch from the user diff: `cut`, `isWaste`, `notes` (only the fields actually changed).
- [ ] **If `cut` changed:** look up the parent inventory in the coverage map and **re-derive `coverageCut`** the same way as creates. Add it to the patch (write `null` if the category doesn't support coverage or `coveragePerUnit` is null).
- [ ] Run `flooringCutLog.update({ where: { id }, data: patch })`.

### 8. Recompute and persist `totalCutSum` per touched inventory

- [ ] For every inventory id in the lock set, recompute `totalCutSum` from the post-diff cut log set (sum of `cut` values across non-void rows; pending and final both contribute).
- [ ] Write the new `totalCutSum` back to each inventory row.

This is what feeds the user-displayed `stockBalance = startingStock − totalCutSum`. The worker doesn't compute `stockBalance` directly — that's a read-time concern.

### 9. Assert the invariant

- [ ] Per touched inventory: `totalCutSum ≤ startingStock`. If violated → throw `WorkOrderCutLogExecutionError` and roll back.

### 10. Flip the WOMI back

- [ ] `markWorkOrderItemStatus(womiId, "IDLE")` — `SAVING_CUTS → IDLE`.

### 11. Commit

Transaction commits. Done.

---

## Failure path

If anything throws inside the worker TX, the TX rolls back — no rows written, WOMI status NOT updated. The processor's catch path:

- [ ] In a fresh TX (so the FAILED marker survives the rollback), run `markWorkOrderItemStatus(womiId, "FAILED")`. The WOMI is now visibly stuck — user retries from the UI.
- [ ] Classify the error:
  - `WorkOrderCutLogExecutionError` (a deliberate domain throw — invariant violation, illegal delete, missing row) → wrap as `UnrecoverableError` so BullMQ doesn't retry. The user must fix the input.
  - Any other error (Prisma transport, Redis hiccup) → re-throw plain so BullMQ retries per its job options.

The `markFailed` write itself is wrapped in a swallow — if it fails, the original error is what we surface. (Stuck-state risk: separate follow-up.)

---

## What this worker does NOT touch

- `before` / `after` — null at create, never updated here. Finalize worker stamps them.
- `cost` / `freight` — null at create, never written on the WO side.
- `finalCutSequence` — null at create. Finalize worker allocates.
- `isFinal` — stays `false`. Finalize worker flips.
- `void` flag and `status = "VOID"` — never set here. Voiding is its own sync flow.
- `cutLogNumber` — DB sequence allocates at insert; never re-touched.
- `createdAt` — DB default at insert; immutable.
- `updatedAt` — Prisma `@updatedAt` handles it automatically on every update.

---

## Inputs the worker can trust

The producer is responsible for:
- Stamping draft UUIDs (so retries are idempotent on the PK).
- Validating WOMI ownership of the work order.
- Enforcing the WOMI status transition gate (`IDLE → SAVING_CUTS`).
- Asserting linkage symmetry on the diff (both `workOrderId` and `workOrderItemId` set on every draft).

The consumer **re-does** under the lock:
- Delete-row status checks (close the gap on FINAL-delete attempts).
- Inventory invariant assertion.

The consumer **does not** re-validate:
- WOMI status transition (the producer already wrote `SAVING_CUTS`; if we reach the worker, we're holding it).
- Linkage symmetry (producer-stamped, immutable in flight).

---

## Idempotency

- Producer's outbox `idempotencyKey` is `wo-pcl-diff:<womiId>:<requestKey>`. Duplicate POSTs collapse via the outbox unique constraint.
- Worker's `createMany` uses producer-stamped UUIDs. A retried job re-runs `createMany` against rows that already exist; Prisma's PK conflict is the natural no-op (we'll need to handle the conflict — either skip-on-conflict or check existence first).
- Update path is idempotent on the same patch (writing the same value is a no-op).
- Delete path is idempotent (`deleteMany` on already-deleted ids is a no-op).
- `recomputeAndPersistTotalCutSums` is idempotent (computes from the same row set, writes the same number).

**Open consideration:** the current `createMany` doesn't have explicit conflict handling. On retry, it would error on the existing PK. Need to confirm whether Prisma's `createMany` with `skipDuplicates: true` is appropriate here (Prisma supports it on Postgres). Or do per-row `upsert` (slower). Either way the producer-stamped UUID guarantees stability.

---

## Locked decisions

1. **Coverage gating** — the four coverage-supporting categories are `vinyl-plank`, `carpet-tile`, `covebase`, `pad` (the keys of `CATEGORY_UNIT_RULES` in [packages/domain/src/flooring/categories/rules.ts:3-8](packages/domain/src/flooring/categories/rules.ts:3)). Any other slug → `coverageCut = null` always. Use the existing `computeCutCoverage` domain helper to derive — it already encapsulates the gating.

2. **Update path coverage re-derivation** — re-derive `coverageCut` **only when `cut` is in the patch**. If the user only edited `notes` or `isWaste`, the existing `coverageCut` stays untouched.

3. **Retry idempotency on createMany** — use `createMany({ data, skipDuplicates: true })`. Single round-trip; Prisma maps to native Postgres `ON CONFLICT DO NOTHING`. Producer-stamped UUIDs make the only possible collision case a genuine retry, where silent skip is the right behavior.

4. **`markFailed` swallow logging** — keep the swallow (so the original error reaches BullMQ for retry/unrecoverable classification), but add an `error`-level structured log line inside the catch carrying `workOrderItemId` + the serialized error. Gives stuck-state observability without changing control flow. Apply in this pass.

5. **`assertCutLogLinkageSymmetry` per-draft loop call** — hoist to a single call at the top of the producer, before any draft-stamping. The args don't vary per draft, so the loop call is dead instrumentation. Apply in this pass.
