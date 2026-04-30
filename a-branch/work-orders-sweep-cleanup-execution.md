# Cleanup Execution Log — Work Orders Sweep

Plan: [work-orders-sweep-cleanup-plan.md](work-orders-sweep-cleanup-plan.md) — locked.

| Action | Status | Commit |
|---|---|---|
| Cleanup — delete dead record-view engine controllers | ✅ DONE | `dacf24c2` |

---

## Audit summary (rolled into this execution)

| Area | Finding |
|---|---|
| Engine consumers from new WO module | 11 imports across 9 files, all in the documented allowlist. ✅ |
| Engine dead code WO sweep made obsolete | `useRecordItemController` + `useRecordAllocationController` — 0 consumers anywhere |
| TODO / FIXME / `@deprecated` in new WO surface | 0 |
| `propertyInstructions` references | All correct (join-derived). 0 stale column refs |
| Re-export hygiene | OK across `@builders/{domain,db,application}` |
| Outbox topic ↔ queue name alignment | OK across producer / dispatcher / processor |
| Pre-existing `npm run typecheck @builders/web` leftovers | 9 (3 admin route, 1 admin module, 5 engine panel/) — out of cleanup scope per user direction |

---

## Cleanup — DONE (committed `dacf24c2`)

| Step | Result |
|---|---|
| Delete `apps/web/modules/shared/engines/record-view/client/controllers/use-record-item-controller.ts` | ✅ |
| Delete `apps/web/modules/shared/engines/record-view/client/controllers/use-record-allocation-controller.ts` | ✅ |
| Edit `apps/web/modules/shared/engines/record-view/client/index.ts` — remove the two `export * from "./controllers/use-record-{item,allocation}-controller"` lines | ✅ |
| `grep -rn "useRecordItemController\|useRecordAllocationController\|RecordItemController\|RecordAllocationController" --include="*.ts" --include="*.tsx" .` | ✅ exit 1 — 0 matches |
| `npm run typecheck --workspace @builders/web` | ⚠️ 9 errors — all pre-existing, exactly matching the documented buckets (3 `app/api/admin`, 1 `modules/admin`, 5 `modules/shared/engines/record-view/panel`). No new errors introduced by the cleanup. |
| Engine `panel/` errors didn't grow | ✅ still 5, unchanged |

**Diff:** `4 files changed, 63 insertions(+), 126 deletions(-)`. Insertions are this plan + the cleanup-plan doc; the actual cleanup is 126 lines deleted across 3 files (2 controller files + 2 re-export lines in `client/index.ts`).

**Open issues:** none.

---

## Notes

- Remaining 9 typecheck leftovers are pre-existing and explicitly out of cleanup scope per user direction. Consolidating those (especially the `app/api/admin/users/[id]/route.ts` SessionUser/GovernableRole mismatch that blocks `npm run build`) needs a separate task — it's the gate ahead of any WO end-to-end smoke run.
- Deferred follow-ups remain on the master plan's "Out of scope" list: cut-log row Grid graduation, unit tests for the new high-risk use cases, inventory record-view cut-log section take-down + worker decommission.
- Per CLAUDE.md: this cleanup file completes the four-file sequence for the WO sweep (`work-orders-sweep-{plan,execution,cleanup-plan,cleanup-execution}.md`).
