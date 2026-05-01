# Audit — WOMI cut-log worker / relay / outbox flow

**Date:** 2026-04-30
**Trigger:** Worker error in dev — `flooring-work-order-item-pending-cut-log-diff` queue, idempotency key `wo-pcl-diff:0244646f-3d9f-4c65-b12c-037ee2d08d3a:077d2fda-f6a3-4cdb-9d2d-0e30251c0983`. Status: `FAILED` on attempt 1.
**Scope:** worker, relay, outbox, producer + consumer use cases, domain, data — for both WO-side cut-log topics (`...pending-cut-log.save` and `...cut-log.finalize`).

---

## TL;DR

**Root cause: one line.** `lockInventoriesForCutLogBatch` in [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:22](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:22) interpolates a JS string array into `Prisma.sql` and casts it to `uuid[]`:

```ts
Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ANY(${unique}::uuid[]) ORDER BY "id" FOR UPDATE`
```

In Prisma 6, `${jsArray}` inside a `Prisma.sql` template **does not bind as a Postgres `text[]`** — it expands to a row-constructor of scalar parameters (`($1, $2, …)`). The `::uuid[]` cast then applies to a record, not an array, leaving each element typed as `text`. PG's `id (uuid) = text` comparison is what produces `42883: operator does not exist: text = uuid`.

This is the **only** raw-SQL array-binding site in `packages/db/src` — there is no working precedent in the repo. Single-id `WHERE "id" = ${someId} FOR UPDATE` (used 5+ places) sidesteps the issue because Prisma binds scalars as `unknown` and PG resolves them against the column type.

---

## Headlines

| # | Severity | Summary | Location |
|---|---|---|---|
| 1 | 🔴 Blocker | `text = uuid` on multi-inventory FOR UPDATE — pending-cut diff blows up on every run | [write-repository.ts:22](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:22) |
| 2 | 🔴 Blocker (latent) | Same bug hits finalize batch on first attempt — same locker, identical call shape | [apply-finalize-work-order-cut-log-batch.ts:45](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts:45) |
| 3 | 🟡 Gap | Zero test coverage for `lockInventoriesForCutLogBatch` — would have caught both blockers pre-merge | — |
| 4 | 🟡 Gap | `markFailed` catch path silently swallows errors — if WOMI status write fails, item stays stuck in `SAVING_CUTS` / `FINALIZING` | [apply-work-order-item-pending-cut-log-diff.ts:99-108](packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts:99) |
| 5 | 🟢 Minor | `assertCutLogLinkageSymmetry` is called inside the per-draft loop with constant args — not per-draft | [save-work-order-item-pending-cut-log-diff.ts:85-94](packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts:85) |
| 6 | 🟢 Minor | Both consumers re-read `startingStock` after `recomputeAndPersistTotalCutSums` — that helper could return it to save one round-trip | [apply-...-pending-...:69-72](packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts:69), [apply-finalize...:110-113](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts:110) |

**Errors observed in this run:** 1 (Prisma `42883`). **Latent error count:** 1 (finalize will fail identically on first use).

---

## Flow audit — per layer

### Producer (use cases that write the outbox event)

| Use case | File | Verdict |
|---|---|---|
| `saveWorkOrderItemPendingCutLogDiffUseCase` | [save-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts) | ✅ Sound. WOMI ownership check, status transition guard, draft id stamping, outbox write all in one TX. Idempotency key folds `requestKey` correctly. |
| `finalizeWorkOrderCutLogBatchUseCase` | [finalize-work-order-cut-log-batch.ts](packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log-batch.ts) | ✅ Sound. Pre-validates every cut log against `getCutLogFinalizabilityBlocker` + `canFinalizeCutLog`, transitions every touched WOMI to `FINALIZING`, writes outbox in same TX. |

### Outbox + relay

- Relay log shows `outbox.event.dispatched` with `dispatchMode:"fresh-enqueue"` for the failing key — relay did its job.
- `createQueueOutboxEvent` is called inside the producer TX — atomic with the WOMI status write. ✅
- BullMQ idempotency keys are 3-part (`wo-pcl-diff:<womiId>:<requestKey>`) — meets BullMQ's split requirement. ✅

### Consumer use cases (called from worker processor)

| Use case | File | Verdict |
|---|---|---|
| `applyWorkOrderItemPendingCutLogDiffUseCase` | [apply-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts) | ❌ Throws on `lockInventoriesForCutLogBatch(c, inventoryIds)` at line 55. |
| `applyFinalizeWorkOrderCutLogBatchUseCase` | [apply-finalize-work-order-cut-log-batch.ts](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts) | ❌ Same — line 45. |

### Data layer

- `getInventoriesForCutLogDiff` / `getInventoriesForCutLogIds`: ✅ both return `string[]` of well-formed UUIDs (Prisma `findMany.select`). No bug here.
- `lockInventoriesForCutLogBatch`: ❌ the broken line.
- `applyWorkOrderItemCutLogPendingDiff`, `applyFinalizeWorkOrderCutLogBatch`, `recomputeAndPersistTotalCutSums`: ✅ all use Prisma client methods (no raw SQL).

### Worker processors

| Processor | File | Verdict |
|---|---|---|
| `processSaveWorkOrderItemPendingCutLogDiffJob` | [apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts](apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts) | ✅ Catch path correctly classifies `WorkOrderCutLogExecutionError` → `UnrecoverableError`, otherwise re-throws for retry. Calls `markFailed` in fresh TX before re-throw. (Today's run: bug is **not** a `WorkOrderCutLogExecutionError`, so BullMQ will retry — but every retry hits the same line 22 deterministically. Net effect: the WOMI lands in `FAILED` after attempts exhaust.) |
| `processFinalizeWorkOrderCutLogBatchJob` | [apps/worker/src/processors/finalize-work-order-cut-log-batch.ts](apps/worker/src/processors/finalize-work-order-cut-log-batch.ts) | ✅ Same shape. |

### State recovery on worker failure (observed today)

- `markWorkOrderItemFailedFromCutLogDiff` runs in a fresh TX so the FAILED state survives the rollback. ✅
- WOMI flips `SAVING_CUTS → FAILED` after BullMQ retries exhaust (or immediately on `UnrecoverableError`). The user's `FAILED` row is then recoverable via a normal retry from the UI.

---

## The fix (proposed — not yet executed)

Replace [write-repository.ts:21-23](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:21) with an `IN`-list whose elements each carry an explicit `::uuid` cast:

```ts
await tx.$queryRaw(
  Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" IN (${Prisma.join(
    unique.map((id) => Prisma.sql`${id}::uuid`),
  )}) ORDER BY "id" FOR UPDATE`,
)
```

Why this works:
- Each id becomes its own bound parameter with an explicit `::uuid` cast (`$1::uuid, $2::uuid, …`). PG sees `uuid = uuid` element-wise.
- `Prisma.join` is the documented Prisma 6 helper for SQL list expansion — there is no other safe way to pass a JS array into `Prisma.sql`.
- Lock semantics preserved: `unique` is still sorted ascending before the call, and the explicit `ORDER BY "id"` keeps the row-lock acquisition order deterministic across concurrent batches.
- Empty-array case is already short-circuited at the top of the function (early return on `inventoryIds.length === 0`), so `IN ()` syntax is unreachable.

**One file changed. Two consumers (`apply-pending-cut-log-diff` + `apply-finalize-cut-log-batch`) are unblocked.**

---

## Recommended companion changes (optional — propose, do not auto-apply)

1. **Add a regression test for `lockInventoriesForCutLogBatch`.** Either an integration test against a real PG (preferred — proves the cast compiles) or a unit test that asserts the rendered SQL contains per-element `::uuid` casts. The bug shape is "raw SQL Prisma binding" — only PG can confirm a fix.
2. **Surface the silent `markFailed` swallow.** Today, if the FAILED-marker write itself errors, the WOMI is stuck. Logging that swallow at `error` level (with the WOMI id) lets us page on stuck states later. Out of scope for the bug fix; flag for a follow-up.
3. **Move `assertCutLogLinkageSymmetry` out of the per-draft loop.** Args are constant per call — one assertion at top of the producer is equivalent. Cosmetic.

---

## Open questions

1. **Scope of this commit.** Per CLAUDE.md, schema changes ship alone but bug fixes can bundle. The fix proposed here is data-only (one `Prisma.sql` rewrite). Do you want it on its own commit, or bundled with the optional regression test (item 1)?
2. **Test approach.** Do we have an integration-test harness against a real PG database in this repo, or should the regression test be a unit-level assertion on the rendered `Prisma.sql` (text-shape check)?
3. **Sweep 4d gating.** You said sweep 5 is on hold until 4d passes. Is this bug fix part of 4d's exit criteria, or is it a separate hot-fix sitting alongside 4d?
4. **Finalize-batch path.** Today's report only saw the pending-diff failure (no one has tried to finalize yet in this dev session). Confirming: do you want the finalize path covered by the same fix commit, or split?

---

## Files reviewed

- `packages/db/src/flooring/work-orders/cut-logs/write-repository.ts`
- `packages/db/src/flooring/work-orders/cut-logs/read-repository.ts`
- `packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts`
- `packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts`
- `packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log-batch.ts`
- `packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts`
- `apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts`
- `apps/worker/src/processors/finalize-work-order-cut-log-batch.ts`
