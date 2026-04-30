# Cleanup Plan — Work Orders Sweep

Companion to:
- [work-orders-sweep-plan.md](work-orders-sweep-plan.md) — locked
- [work-orders-sweep-execution.md](work-orders-sweep-execution.md) — DONE

## Context

The work-orders sweep (7a–7l) wiped `apps/web/modules/work-orders/` and rebuilt it on the canonical `apps/web/{transport,controllers,query-policies}/` pattern. That removed the last consumer of two heavyweight engine controllers under `apps/web/modules/shared/engines/record-view/client/controllers/`. Per the CLAUDE.md rule — "Do not delete anything from modules/shared unless there are absolutely 0 consumers and it is dead code" — those two files are now eligible for deletion.

The audit also surfaced 9 pre-existing typecheck leftovers in unrelated surfaces (admin routes, engine `panel/` import paths) and several net-new follow-ups (cut-log row Grid graduation, unit tests for the new use cases). Per user direction those are explicitly **out of scope** for this cleanup — they belong to a separate task / sweep.

## Audit summary

| Area | Finding |
|---|---|
| Engine consumers from new WO module | 11 imports across 9 files, all in the documented allowlist. ✅ |
| Engine dead code WO sweep made obsolete | `useRecordItemController` + `useRecordAllocationController` — 0 consumers anywhere |
| TODO / FIXME / `@deprecated` in new WO surface | 0 |
| `propertyInstructions` references | All correct (join-derived). 0 stale column refs |
| Re-export hygiene | OK across `@builders/{domain,db,application}` |
| Outbox topic ↔ queue name alignment | OK across producer / dispatcher / processor |
| Pre-existing `npm run typecheck @builders/web` leftovers | 9 (3 admin route, 1 admin module, 5 engine panel/ — **NOT in cleanup scope per user**) |

## Recommended approach

Delete the two dead engine controllers and remove their re-exports.

| # | Action | File |
|---|---|---|
| 1 | Delete file | `apps/web/modules/shared/engines/record-view/client/controllers/use-record-item-controller.ts` |
| 2 | Delete file | `apps/web/modules/shared/engines/record-view/client/controllers/use-record-allocation-controller.ts` |
| 3 | Remove line 7 (`export * from "./controllers/use-record-allocation-controller"`) and line 9 (`export * from "./controllers/use-record-item-controller"`) | `apps/web/modules/shared/engines/record-view/client/index.ts` |

Both deletion targets are pure React hooks with only `react` imports — deletion orphans no shared types or helpers. Verified the WO sweep was the last consumer via `grep -rn "useRecord(Item|Allocation)Controller" --include="*.ts" --include="*.tsx"`: only the two definition files match.

## Verification

| Gate | Command | Expected |
|---|---|---|
| Confirm 0 consumers post-delete | `grep -rn "useRecordItemController\|useRecordAllocationController\|RecordItemController\|RecordAllocationController" --include="*.ts" --include="*.tsx" .` | 0 matches |
| Confirm no NEW typecheck regressions | `npm run typecheck --workspace @builders/web 2>&1 \| awk -F'/' '{print $1"/"$2}' \| sort \| uniq -c` | Same 9 pre-existing leftovers (3 `app/api/admin`, 1 `modules/admin`, 5 `modules/shared`). No new buckets. |
| Confirm engine panel/ errors didn't grow | Same command above | 5 in `modules/shared`, unchanged |

## Out of scope (explicit)

| Item | Why deferred |
|---|---|
| Fix 5 engine `panel/` `../client/...` import path errors | Pre-existing engine internals, not WO sweep fallout. Separate engine cleanup. |
| Fix 3 errors in `app/api/admin/users/[id]/route.ts` (SessionUser Role vs GovernableRole) | Unrelated to WO sweep. Blocks `npm run build` so blocks WO smoke testing — recommend a separate cleanup task ahead of any WO smoke run. |
| Fix `modules/admin/controller/use-admin-user-primary-controller.ts:15` (`updatedAt` missing) | Unrelated, same admin scope. |
| Manual smoke verification of WO end-to-end (10-step plan from master plan §Verification) | Blocked on the admin build fix above. Run after that lands. |
| Graduate `apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx` from raw `<table>` → `Grid` + `ScopedRow` | Net-new UI work, not cleanup. Defer to a follow-up sweep — execution log already flags this for "graduate if static approach holds". |
| Unit tests for `save-work-order-item-pending-cut-log-diff` / `apply-finalize-work-order-cut-log-batch` / `void-work-order-cut-log` (multi-inventory locking, status transitions, idempotency) | Net-new test coverage, not cleanup. Defer. |
| Inventory record-view cut-log section take-down + worker decommission | Already documented as a follow-up sweep in master plan §"Out of scope". |

## Critical files to modify (summary)

- DELETE `apps/web/modules/shared/engines/record-view/client/controllers/use-record-item-controller.ts`
- DELETE `apps/web/modules/shared/engines/record-view/client/controllers/use-record-allocation-controller.ts`
- EDIT `apps/web/modules/shared/engines/record-view/client/index.ts` (remove 2 re-export lines)

Single commit. After landing, this plan locks and execution lands at `work-orders-sweep-cleanup-execution.md` with the commit SHA appended.
