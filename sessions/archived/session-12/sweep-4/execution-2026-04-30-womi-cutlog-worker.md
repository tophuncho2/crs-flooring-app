# Execution — WOMI cut-log worker fix (Path B)

**Date:** 2026-04-30
**Audit:** [audit-2026-04-30-womi-cutlog-worker.md](audit-2026-04-30-womi-cutlog-worker.md)
**Approach:** Path B — drop raw-SQL array binding, loop per-id with the single-id `Prisma.sql` pattern used everywhere else in the repo.
**Scope locked:** one-file data-layer change. Tests deferred. Sweep 5 not in scope.

---

## What changed

**One file. One function body. Plus its docstring.**

[packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:5-26](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:5)

### Before (broken)

```ts
/**
 * Multi-inventory deterministic FOR UPDATE locker. Sorts the inventory
 * id set ascending, then takes a single `SELECT ... FOR UPDATE` over the
 * sorted id array. Deterministic ordering avoids deadlocks when two
 * concurrent WO-side cut-log batches touch overlapping inventories.
 *
 * First multi-inventory locker in the codebase. Single-inventory cut-log
 * workers (inventory-side `pending-save`, `finalize`, `void`) use the
 * single-id variant elsewhere.
 */
export async function lockInventoriesForCutLogBatch(
  tx: Prisma.TransactionClient,
  inventoryIds: string[],
): Promise<void> {
  if (inventoryIds.length === 0) return
  const unique = Array.from(new Set(inventoryIds)).sort()
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ANY(${unique}::uuid[]) ORDER BY "id" FOR UPDATE`,
  )
}
```

### After (fixed)

```ts
/**
 * Multi-inventory deterministic FOR UPDATE locker. Sorts the inventory
 * id set ascending, then acquires a single-row `FOR UPDATE` lock per id
 * in that order. Deterministic ordering avoids deadlocks when two
 * concurrent WO-side cut-log batches touch overlapping inventories.
 *
 * Uses the same single-id `Prisma.sql` pattern as every other locker in
 * the codebase (inventory-side `pending-save`, `finalize`, `void`,
 * `flooring_import_entry`, `flooring_work_order_file`).
 */
export async function lockInventoriesForCutLogBatch(
  tx: Prisma.TransactionClient,
  inventoryIds: string[],
): Promise<void> {
  if (inventoryIds.length === 0) return
  const unique = Array.from(new Set(inventoryIds)).sort()
  for (const id of unique) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${id} FOR UPDATE`,
    )
  }
}
```

**No other source files modified.** The function signature is unchanged, so both consumers (`applyWorkOrderItemPendingCutLogDiffUseCase` and `applyFinalizeWorkOrderCutLogBatchUseCase`) call it identically — they're unblocked transparently.

---

## What this resolves

| Audit item | Status |
|---|---|
| 🔴 #1 — `text = uuid` on multi-inventory FOR UPDATE | ✅ Fixed |
| 🔴 #2 — Same bug latent in finalize batch | ✅ Fixed (same locker) |
| 🟡 #3 — Zero test coverage on the locker | ⏳ Deferred per direction ("we can set up tests after") |
| 🟡 #4 — Silent `markFailed` swallow | ⏳ Out of scope for this commit |
| 🟢 #5 — `assertCutLogLinkageSymmetry` constant-args loop call | ⏳ Out of scope |
| 🟢 #6 — Re-read of `startingStock` after recompute | ⏳ Out of scope |

**Carve-out removed:** the function-level docstring no longer flags itself as "first multi-inventory locker in the codebase" — it now matches the established single-id pattern used in 5+ other places. Future readers don't have to learn a special-purpose `Prisma.join` + per-element-cast trick.

---

## Verification

| Check | Result |
|---|---|
| `npm run typecheck --workspace @builders/db` | ✅ clean |
| `npm run typecheck --workspace @builders/application` | ✅ clean |
| `npm run typecheck --workspace @builders/worker` | ✅ clean |
| `npm run typecheck --workspace @builders/relay` | ✅ clean |
| `npm run build --workspace @builders/db` | ✅ dist regenerated, file confirmed at [packages/db/dist/flooring/work-orders/cut-logs/write-repository.js:14-21](packages/db/dist/flooring/work-orders/cut-logs/write-repository.js:14) |

**Runtime verification (not run, deferred):** trigger a WOMI pending-cut-log save in dev and confirm the worker logs `pending_cut_log_diff.completed` instead of `failed` with the `42883` error. The dev worker is currently stuck retrying — restarting `dev:worker` will pick up the rebuilt `@builders/db` dist.

---

## Behavioral notes

- **End state of the lock is unchanged.** N rows locked in ascending order within the same TX. PG row-locks accumulate within a TX, so N single-row `FOR UPDATE` queries leave the same lock state as one multi-row `FOR UPDATE`.
- **Round-trip count goes from 1 to N.** Cut-log batches in practice touch a handful of inventories (typically <20), so the latency cost is sub-millisecond per id and not measurable end-to-end.
- **Determinism preserved.** `unique` is sorted ascending before the loop, so two concurrent batches that overlap on inventory ids will acquire locks in the same order — no deadlocks introduced.

---

## Open follow-ups (not addressed here)

1. **Regression test for `lockInventoriesForCutLogBatch`** — explicitly deferred. Whatever harness we land on (real PG vs. SQL-shape unit) should also cover both call paths (pending-cut + finalize).
2. **`markFailed` silent-swallow logging** (audit item #4) — separate ticket. Stuck-state risk if the FAILED-marker write itself errors.
3. **Cosmetic items** (#5, #6) — bundle whenever the next pass through these files happens.

---

## Commit message (do not commit yet)

```
worker: fix WO-side cut-log multi-inventory locker — drop raw-SQL array binding

Replace the single multi-row `WHERE "id" = ANY($1::uuid[])` lock query
in `lockInventoriesForCutLogBatch` with a per-id loop using the same
single-id `Prisma.sql` `FOR UPDATE` pattern used by every other locker
in the codebase (inventory-side pending-save / finalize / void,
flooring_import_entry, flooring_work_order_file).

Prisma 6's `Prisma.sql` template-literal interpolation of a JS array
expands to a row-constructor of scalar parameters (`($1, $2, …)`) rather
than binding as a Postgres `text[]`. The `::uuid[]` cast then applied to
a record, leaving each element typed `text`, so PG rejected the
`id (uuid) = text` comparison inside `ANY()` with `42883:
operator does not exist: text = uuid`. The bug deterministically failed
every WOMI pending-cut-log save and would have failed every
finalize-batch on first use.

Removes the "first multi-inventory locker in the codebase" carve-out —
all `FOR UPDATE` sites now follow the same single-id shape. End-state
lock semantics are unchanged (N rows locked in ascending order within
the same TX); deterministic ordering preserved by sorting the id set
before the loop.

One file. Function signature unchanged — both consumers
(`applyWorkOrderItemPendingCutLogDiffUseCase`,
`applyFinalizeWorkOrderCutLogBatchUseCase`) unblocked transparently.

Audit: sessions/audit-2026-04-30-womi-cutlog-worker.md
Execution: sessions/execution-2026-04-30-womi-cutlog-worker.md
```
