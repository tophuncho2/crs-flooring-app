# Execution — Schema migration: cut log `before` / `after` → nullable

**Date:** 2026-04-30
**Step:** 1 of 2 (schema migration only). Step 2 = the worker fixes scoped in [audit-2026-04-30-pending-cut-log-worker.md](audit-2026-04-30-pending-cut-log-worker.md) and [audit-2026-04-30-finalize-cut-log-worker.md](audit-2026-04-30-finalize-cut-log-worker.md).
**Approach:** Drop NOT NULL on `flooring_cut_log.before` and `flooring_cut_log.after`. Propagate the nullable type through the minimum set of files needed to keep the codebase compiling. No runtime behavior change yet — the new pending worker (step 2) is what will start writing nulls.

---

## What changed

### Schema + migration

| File | Action | Content |
|---|---|---|
| [packages/db/prisma/schema.prisma:394, 397](packages/db/prisma/schema.prisma:394) | **EDIT** | `before Decimal` → `before Decimal?` and `after Decimal` → `after Decimal?` |
| [packages/db/prisma/migrations/20260501152403_make_cut_log_before_after_nullable/migration.sql](packages/db/prisma/migrations/20260501152403_make_cut_log_before_after_nullable/migration.sql) | **CREATE** | `ALTER TABLE "flooring_cut_log" ALTER COLUMN "before" DROP NOT NULL, ALTER COLUMN "after" DROP NOT NULL;` |

Postgres metadata-only operation — no table rewrite, no data backfill, instant on any table size. Dev DB applied via `prisma migrate dev`.

### Domain type propagation

| File | Action | Content |
|---|---|---|
| [packages/domain/src/flooring/inventory/cut-logs/types.ts:31, 33](packages/domain/src/flooring/inventory/cut-logs/types.ts:31) | **EDIT** | `CutLogRow.before: string` → `string \| null`; same for `after` |
| [packages/domain/src/flooring/work-orders/cut-logs/types.ts:18, 20](packages/domain/src/flooring/work-orders/cut-logs/types.ts:18) | **EDIT** | `WorkOrderItemPendingCutLogRow.before: string` → `string \| null`; same for `after` |
| [packages/domain/src/flooring/work-orders/cut-logs/normalizers.ts](packages/domain/src/flooring/work-orders/cut-logs/normalizers.ts) | **EDIT** | Input type accepts null for `before`/`after`; output passes null through |

### Data layer normalizers

| File | Action | Content |
|---|---|---|
| [packages/db/src/flooring/inventory/cut-logs/read-repository.ts:43, 45](packages/db/src/flooring/inventory/cut-logs/read-repository.ts:43) | **EDIT** | `toDecimalString(row.before)` → `toDecimalStringOrNull(row.before)`; same for `after` (matches the existing pattern for `coverageCut`/`cost`/`freight`) |
| [packages/db/src/flooring/work-orders/read-repository.ts:293, 295](packages/db/src/flooring/work-orders/read-repository.ts:293) | **EDIT** | PDF builder projection: `cl.before.toString()` → `cl.before === null ? "" : cl.before.toString()`; same for `after`. **Stopgap only** — proper null-aware PDF rendering is part of the deferred PDF worker task (item 3 in [next-steps-checklist.md](session-12/sweep-4/next-steps-checklist.md)). |

### Files NOT touched (intentionally)

- **`apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx`** renders `{row.before}` and `{row.after}` raw. After the type flip, these render empty for null values (React renders `null` as nothing — no `"null"` string artifact). Acceptable UX for PENDING rows post step 2; cleaner `?? "—"` fallback can layer on with the worker fixes.
- **Inventory cut-log section UIs** ([inventory-cut-logs-section.tsx](apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx), [inventory-historical-cut-logs-section.tsx](apps/web/modules/inventory/components/record/sections/inventory-historical-cut-logs-section.tsx)) already use `value ?? "—"` — null-safe by construction.
- **`buildVoidedCutLogPatch`** (domain) doesn't touch `before`/`after` — void preserves history. No change.
- **`assertBeforeCutAfterInvariant`** (domain) keeps its non-null `{before, cut, after}` signature — only called when both are stamped (post-finalize). Currently has zero callers; will get a caller in step 2.

---

## Why no runtime change yet

The migration only **allows** null storage. It doesn't introduce any nulls:
- Existing rows keep their non-null `before`/`after` values.
- The current pending worker still computes and writes `before.toFixed(2)` / `after.toFixed(2)` (the bug from the audit). That changes in step 2.
- The current finalize worker doesn't touch before/after either way.

So immediately after this commit, the production DB has the same row shape it always did — just with the constraint relaxed.

---

## Verification

| Check | Result |
|---|---|
| `npx prisma migrate dev` (dev DB) | ✅ Applied. Generated SQL is exactly the 2-statement `ALTER COLUMN ... DROP NOT NULL` we expected. |
| `npm run build --workspace @builders/domain` | ✅ Domain dist regenerated with `CutLogRow.before: string \| null` etc. |
| `npm run build --workspace @builders/db` | ✅ Prisma client regenerated; db dist rebuilt against the new domain types. |
| `npm run typecheck` (root — all 8 packages) | ✅ All 8 clean: `domain`, `lib`, `db`, `pdf`, `application`, `web`, `relay`, `worker`. |
| Migration history | New migration `20260501152403_make_cut_log_before_after_nullable` is the next one after `20260429160000_add_work_order_item_status`. |

---

## Commit message (do not commit yet)

```
schema: make flooring_cut_log.before and flooring_cut_log.after nullable

Drop NOT NULL on the two columns so the WO-side pending cut-log worker
can leave them null until the finalize worker stamps them. Lays the
groundwork for the worker fixes in the next commit; no behavior change
in this one (existing rows keep their non-null values; current workers
keep writing non-null values until they're updated separately).

Migration is metadata-only — Postgres ALTER COLUMN ... DROP NOT NULL
runs in milliseconds with no table rewrite or data backfill.

Type propagation:
- domain CutLogRow + WorkOrderItemPendingCutLogRow flip
  before/after to string | null
- inventory cut-log normalizer uses toDecimalStringOrNull (matching
  the existing coverageCut/cost/freight pattern)
- WO file-generation read repo gets a stopgap null guard for the PDF
  projection (proper null-aware PDF rendering deferred to the PDF
  worker task)

Audit: sessions/audit-2026-04-30-pending-cut-log-worker.md
       sessions/audit-2026-04-30-finalize-cut-log-worker.md
Execution: sessions/execution-2026-04-30-cut-log-before-after-nullable.md
```

---

## Next

Step 2 picks up here — execute the worker fixes per the two audits:
- Pending worker: stop writing `before`/`after`, derive `coverageCut` from inventory, re-derive on update, stop writing `cost`/`freight` (already correct).
- Finalize worker: compute `before`/`after` per inventory using running balance from existing FINAL non-void cuts, stamp alongside `finalCutSequence`. Drop the no-op `recomputeAndPersistTotalCutSums` + invariant assertion calls.

Open questions in both audits still need your call before step 2 lands. Most important:
1. `assertCutLogDeleteAllowed` wire-up (consumer-side, under the lock — recommended)?
2. `before`/`after` running-balance derivation read source (extra query vs. derive from already-pulled rows)?
