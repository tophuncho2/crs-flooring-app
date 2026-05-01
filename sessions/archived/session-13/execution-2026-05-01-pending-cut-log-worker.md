# Execution — Pending Cut Log Worker hardening

**Date:** 2026-05-01
**Plan:** [plan-2026-05-01-pending-cut-log-worker.md](plan-2026-05-01-pending-cut-log-worker.md)
**Description (locked):** [worker-descriptions/cut-logs/pending-cut-log-worker/description.md](worker-descriptions/cut-logs/pending-cut-log-worker/description.md)
**Predecessor:** [execution-2026-04-30-cut-log-before-after-nullable.md](execution-2026-04-30-cut-log-before-after-nullable.md) — schema migration that made this fix possible.
**Scope:** pending worker only. Finalize and void are explicitly NOT touched.

---

## What changed

Five files touched across application + data + domain (errors) + UI layers.

| # | File | What |
|---|---|---|
| 1 | [packages/application/src/flooring/work-orders/cut-logs/errors.ts](packages/application/src/flooring/work-orders/cut-logs/errors.ts) | Added `WORK_ORDER_CUT_LOG_DELETE_NOT_ALLOWED` to the error code union |
| 2 | [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts) | `applyWorkOrderItemCutLogPendingDiff` rewritten: dropped before/after computation, accepts pre-derived `coverageCut` on drafts and updates, uses `createMany({ skipDuplicates: true })`, emits null-default rows for `before/after/cost/freight/finalCutSequence` (Prisma defaults) |
| 3 | [packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts) | Hoisted `assertCutLogLinkageSymmetry` out of the per-draft loop into a single call before draft-id stamping |
| 4 | [packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts) | Consumer reads coverage data per touched inventory under the lock; pre-reads every referenced cut log in one batched query; **enforces WOMI-linkage check on every referenced row** (closes cross-WOMI mutation gap); re-validates deletes via `assertCutLogDeleteAllowed`; enriches drafts and `cut`-changing updates with derived `coverageCut`; `markFailed` swallow now logs at error level via `logStructuredEvent` |
| 5 | [apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx) | UI `?? "—"` fallback on `{row.before}` and `{row.after}` so PENDING rows render gracefully |

---

## Per-decision recap

| # | Decision | Implementation |
|---|---|---|
| 1 | Coverage gating (4 categories) | Consumer reads `{categorySlug, coveragePerUnit}` per inventory, calls domain `computeCutCoverage`, formats result to `Decimal(12, 2)` string |
| 2 | Re-derive `coverageCut` only when `cut` changes | Consumer filters `payload.diff.modified` to entries with `patch.cut !== undefined`, only fetches parent inventoryId for those, only adds `coverageCut` to the patch for those |
| 3 | `createMany({ skipDuplicates: true })` | Single `createMany` call in the data layer with the flag set; producer-stamped UUIDs ensure retry idempotency |
| 4 | `markFailed` swallow → error log | `logStructuredEvent({ level: "error", service: "builders-application", environment: process.env.NODE_ENV ?? "unknown", ... })` inside the catch; original error still propagates to BullMQ unchanged |
| 5 | Hoist `assertCutLogLinkageSymmetry` | Single call at top of producer (line 70 area), before `assignDraftIds`; per-draft loop body is now just `tempIdMap[draft.tempId] = draft.id` |

---

## Verification

| Check | Result |
|---|---|
| `npm run build --workspace @builders/domain` | ✅ clean |
| `npm run build --workspace @builders/db` (incl. `prisma generate`) | ✅ clean |
| `npm run typecheck` (root) — `lib`, `db`, `pdf`, `application`, `web`, `relay`, `worker` | ✅ all 8 packages clean |

---

## Behavioral changes

- **New pending rows write null `before`/`after`/`finalCutSequence`/`cost`/`freight`.** The schema (already migrated) accepts them; the finalize worker (TBD) is what stamps before/after/finalCutSequence.
- **`coverageCut` is now correctly derived on creates.** When the parent inventory's category is in `{vinyl-plank, carpet-tile, covebase, pad}` AND `coveragePerUnit` is non-null, `coverageCut = cut × coveragePerUnit` (formatted to 2 decimals). Otherwise null.
- **`coverageCut` is re-derived on updates that change `cut`.** Notes-only or isWaste-only edits leave `coverageCut` untouched.
- **Cut logs from other WOMIs cannot be mutated via the pending diff.** The consumer pre-reads every referenced cut log (modified + deleted) under the lock and verifies `workOrderItemId === payload.workOrderItemId` for each existing row. A crafted payload that slips another WOMI's cut-log id into `modified[]` or `deleted[]` now throws `WorkOrderCutLogExecutionError("WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH", 409)`. Closes a pre-existing cross-WOMI mutation gap that the original code carried.
- **Final / voided / queued cut logs cannot be deleted via the pending diff.** The consumer asserts `assertCutLogDeleteAllowed` per delete entry under the lock (sharing the pre-read with the linkage check); mismatches throw `WorkOrderCutLogExecutionError("WORK_ORDER_CUT_LOG_DELETE_NOT_ALLOWED", 409)`. Producer flow is unchanged — the gap was always at the consumer/data boundary.
- **Stuck-state observability.** If `markWorkOrderItemStatus(womiId, "FAILED")` itself errors (Prisma transport blip during recovery), an `error`-level structured log line surfaces with `workOrderItemId` and the serialized error. Original failure-mode error still flows to BullMQ unchanged.
- **Retry idempotency on creates.** `createMany({ skipDuplicates: true })` maps to native `INSERT ... ON CONFLICT DO NOTHING` — a retried worker job is a silent no-op against rows already in the table.

## What didn't change

- `lockInventoriesForCutLogBatch` — already hardened in earlier commit (single-id loop pattern).
- `recomputeAndPersistTotalCutSums` — same call site, same behavior. Still drives the inventory's `totalCutSum` (and therefore the user-displayed `stockBalance`).
- `assertCutSumWithinStartingStock` invariant assertion — unchanged.
- WOMI status flow (`IDLE → SAVING_CUTS → IDLE` on success, `... → FAILED` on throw) — unchanged.
- Producer's outbox-event shape and idempotency key — unchanged.
- Worker processor (BullMQ handler) — unchanged.
- Existing pending rows in the DB — kept their old before/after values (no backfill). They'll get re-stamped by the finalize worker once it's hardened.

---

## Manual UI smoke test (recommended before commit)

After restarting `dev:worker` to pick up the rebuilt `@builders/db` dist:

1. Open a WOMI for an inventory in a coverage-supporting category (`vinyl-plank` / `carpet-tile` / `covebase` / `pad`) where `coveragePerUnit` is set.
2. Add a pending cut. Save. → Row appears in the section. `before`/`after` cells render `—`. `coverageCut` cell shows `cut × coveragePerUnit`.
3. Add a pending cut on an inventory in a non-coverage category (or one with `coveragePerUnit = null`). Save. → Row appears with `coverageCut = ""` (or `—` per the existing renderer).
4. Edit the first row's `cut`. Save. → `coverageCut` re-derives to match the new `cut`.
5. Edit only the `notes` of a row. Save. → `coverageCut` is unchanged.
6. Delete a pending row. Save. → Row disappears.
7. (Best-effort) Force a delete payload that targets a final cut log (via direct API call or DevTools). → 409 with `WORK_ORDER_CUT_LOG_DELETE_NOT_ALLOWED`. WOMI flips to `FAILED` (per the catch path).
8. Save the same diff twice in quick succession (or simulate a worker retry). → Second attempt is a no-op via `skipDuplicates`. WOMI ends `IDLE`, no duplicate rows.

---

## Commit message (do not commit yet)

```
worker: harden WO-side pending cut-log worker

The pending cut-log worker now:
- Leaves `before`/`after`/`finalCutSequence`/`cost`/`freight` null on
  every new draft. Those columns are the finalize worker's
  responsibility (the schema migration earlier today made this
  representable).
- Derives `coverageCut` per draft from the parent inventory's
  `coveragePerUnit` and `categorySlug` via the existing domain
  `computeCutCoverage` helper. The four coverage-supporting categories
  (vinyl-plank / carpet-tile / covebase / pad) get `cut × coveragePerUnit`;
  every other category gets null.
- Re-derives `coverageCut` on update when (and only when) the user
  changes `cut`. Notes-only or isWaste-only edits leave `coverageCut`
  untouched.
- Pre-reads every cut log referenced by `modified[]` or `deleted[]` in
  one batched query under the inventory FOR UPDATE lock. The same read
  drives three under-lock validations:
  - **WOMI linkage** — every existing referenced row's
    `workOrderItemId` must match the payload's WOMI. Closes a
    pre-existing cross-WOMI mutation gap where a crafted payload could
    delete or update cut logs belonging to a different WOMI.
  - **Delete-allowed** — `assertCutLogDeleteAllowed` rejects any
    delete targeting a final / voided / queued row (those can only be
    voided).
  - **Coverage re-derivation** — supplies the parent `inventoryId` for
    `cut`-changing updates without a second round-trip.
- Uses `createMany({ skipDuplicates: true })` for retry idempotency.
  Producer-stamped UUIDs make the only collision case a genuine retry,
  where silent skip is the correct semantic.

Also:
- Hoists `assertCutLogLinkageSymmetry` out of the producer's per-draft
  loop. The args don't vary across drafts; one call at the top is
  sufficient.
- Replaces the silent `markFailed` swallow with an error-level
  structured log carrying `workOrderItemId` and the serialized error.
  Surfaces stuck-state risk if the FAILED-marker write itself fails.
  Original error still flows to BullMQ unchanged.
- UI: adds `?? "—"` fallback on the WO cut-log row's `before`/`after`
  cells so PENDING rows render gracefully now that those columns can
  be null.

Description: worker-descriptions/cut-logs/pending-cut-log-worker/description.md
Plan: sessions/plan-2026-05-01-pending-cut-log-worker.md
Execution: sessions/execution-2026-05-01-pending-cut-log-worker.md
```

---

## What's next (pending worker is done)

Per the [next-steps checklist](session-12/sweep-4/next-steps-checklist.md):

- [x] Verify the **pending cut log worker** ← this commit
- [ ] Verify the **finalize cut log worker** ← unblocked
- [ ] Re-audit the **void flow** after finalize lands
- [ ] Complete the **PDF generation worker** job
- [ ] Update the **service variables** (sweep 6)

The pending worker is now solidified. The finalize worker is the next surface to harden — its description file [worker-descriptions/cut-logs/finalizing-cut-log-worker/description.md](worker-descriptions/cut-logs/finalizing-cut-log-worker/description.md) is empty, awaiting the same audit/lock/plan/execute treatment.
