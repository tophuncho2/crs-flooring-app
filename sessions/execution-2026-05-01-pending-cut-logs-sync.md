# Execution Log — Pending Cut Logs: Sync Per-Row Use Cases

**Plan:** `sessions/plan-2026-05-01-pending-cut-logs-sync.md` (locked on approval)
**Started:** _to be filled when execution begins_
**Owner:** _Claude, working from staging on the staging worktree_

This file tracks each phase's progress, files touched, errors encountered, and verification outcomes. Updated as execution proceeds. A `cleanup-2026-05-01-pending-cut-logs-sync.md` file may be created later to checklist any corrections needed against this log.

---

## Phase 0 — Schema (own commit)

**Goal:** Drop `SAVING_CUTS` from `FlooringWorkOrderItemStatus`.

**Files:**
- [x] `packages/db/prisma/schema.prisma` — enum reduced to `IDLE | FINALIZING | FAILED` (line 124–128).
- [x] `packages/db/prisma/migrations/20260501190000_drop_work_order_item_status_saving_cuts/migration.sql` (NEW).

**Migration SQL pattern:**
1. Defensive `UPDATE flooring_work_order_item SET status='IDLE' WHERE status='SAVING_CUTS'` (no-op in steady state).
2. `ALTER COLUMN status DROP DEFAULT` (Postgres needs the default off the column before swapping the underlying type).
3. Rename old type out of the way → create narrowed type → `ALTER COLUMN status TYPE ... USING status::text::...` → restore `DEFAULT 'IDLE'` → drop renamed-out type.

**Pre-migration check (run against the target DB before deploy):**
- `SELECT count(*) FROM "flooring_work_order_item" WHERE "status" = 'SAVING_CUTS';` — expected 0 in steady state. Migration backfills any non-zero result to `IDLE` defensively.

**Verification:**
- [x] Prisma client regenerated via `pnpm --filter @builders/db db:generate` (path: `packages/db`, run with the workspace-hoisted prisma binary). Generated `node_modules/.prisma/client/schema.prisma` and `index-browser.js` now show the narrowed enum (`IDLE`, `FINALIZING`, `FAILED`).
- [x] **Migration applied** via `npx prisma migrate deploy` (run from `packages/db` with `DOTENV_CONFIG_PATH=../../.env`). Output confirmed: `Applying migration 20260501190000_drop_work_order_item_status_saving_cuts` → `All migrations have been successfully applied.` Target DB: Railway Postgres (`railway` database, `public` schema) at `shortline.proxy.rlwy.net:22153`. Defensive `UPDATE ... SET status='IDLE' WHERE status='SAVING_CUTS'` ran first; enum swap completed without errors.
- [ ] `pnpm typecheck` (monorepo-wide) is **expected red** until Phase 1 + Phase 4 land. Confirmed callsites that reference `SAVING_CUTS` and will be fixed/deleted in later phases:

| File | Disposition |
|---|---|
| `packages/domain/src/flooring/work-orders/material-items/types.ts:1` | EDIT in Phase 1 (drop literal from union). |
| `packages/domain/src/flooring/work-orders/material-items/status-rules.ts:5–8` | EDIT in Phase 1 (rebuild transition map without SAVING_CUTS keys). |
| `packages/db/src/flooring/work-orders/material-items/write-repository.ts:173–174` | DOC-COMMENT update in Phase 2 (non-breaking — doc only). |
| `packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts` | DELETE in Phase 4. |
| `packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts` | DELETE in Phase 4. |
| `packages/domain/src/queue/save-work-order-item-pending-cut-log-diff.ts` | DELETE in Phase 4. |
| `apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/section/route.ts:23` | DELETE in Phase 5 (the comment + file go away together). |
| `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx:44` | EDIT in Phase 7 (UI sweep — the `case "SAVING_CUTS":` branch becomes unreachable + can be removed). The line is inert until Phase 7 because the runtime enum no longer emits the value. |

**Commit message (when user is ready):**

```
schema: drop SAVING_CUTS from FlooringWorkOrderItemStatus

Pending cut log mutations move to synchronous per-row use cases in
the same sweep, so the IDLE -> SAVING_CUTS -> IDLE round-trip the
old worker producer/consumer used is no longer needed. The
request's TX holds the inventory row lock for the duration. The
migration defensively flips any pre-existing SAVING_CUTS rows to
IDLE before swapping the enum type.
```

**Status:** ✅ committed and applied to the Railway DB.

**Notes:**
- Migration was applied immediately after commit per user's call. The running worker / relay / web processes still reference the deleted `SAVING_CUTS` enum literal in TypeScript source — they will throw at runtime if any code path that currently writes `"SAVING_CUTS"` gets exercised before Phase 4 deletes it. In practice the producer use case is the only writer of that value, and it only runs when the section route fires — both of which we are about to dismantle. Phase 1 starts immediately.
- The package manager warning `"workspaces" field in package.json is not supported by pnpm. Create a "pnpm-workspace.yaml" file instead.` is pre-existing — npm-style workspaces hoist at the root, and pnpm tolerates it. Out of scope for this sweep.
- Working tree before Phase 0: only the two new files in `sessions/`. After Phase 0: schema.prisma edit + new migration folder + regenerated client artifacts in `node_modules/.prisma/client/` (those are gitignored and not committed).

---

## Phase 1 — Domain

**Goal:** Add per-row mutation predicates; remove queue contract for the pending diff topic.

**Files:**
- [x] `packages/domain/src/flooring/work-orders/material-items/types.ts` (UPDATED) — `WorkOrderItemStatus` union narrowed to `"IDLE" | "FINALIZING" | "FAILED"`.
- [x] `packages/domain/src/flooring/work-orders/material-items/status-rules.ts` (UPDATED) — `ALLOWED_TRANSITIONS` rebuilt without `SAVING_CUTS`. Final transitions: `IDLE → {IDLE, FINALIZING}`, `FINALIZING → {IDLE, FAILED}`, `FAILED → {FINALIZING, IDLE}`.
- [x] `packages/domain/src/flooring/work-orders/errors.ts` (UPDATED) — added `WORK_ORDER_ITEM_NOT_IDLE` to `WorkOrderDomainErrorCode`.
- [x] `packages/domain/src/flooring/inventory/cut-logs/errors.ts` (UPDATED) — added `CUT_LOG_STALE_UPDATED_AT` to `CutLogDomainErrorCode`.
- [x] `packages/domain/src/flooring/inventory/cut-logs/pending-mutation-rules.ts` (NEW) — three assertions:
  - `assertWorkOrderItemReadyForCutLogMutation({ status })` — throws `WorkOrderDomainError("WORK_ORDER_ITEM_NOT_IDLE")` when status !== IDLE.
  - `assertCutLogPendingMutationAllowed(row)` — delegates to `assertCutLogDeleteAllowed` (identical predicate; surfaces under update-or-delete intent name).
  - `assertCutLogExpectedUpdatedAtMatches({ rowUpdatedAt, expected })` — throws `CutLogDomainError("CUT_LOG_STALE_UPDATED_AT")` on mismatch.
- [x] `packages/domain/src/flooring/inventory/cut-logs/index.ts` (UPDATED) — barrel re-exports `pending-mutation-rules.js`.
- [x] `packages/domain/src/flooring/work-orders/cut-logs/types.ts` (UPDATED) — added `CreatePendingCutLogInput`, `UpdatePendingCutLogInput`, `UpdatePendingCutLogPatch`, `DeletePendingCutLogInput`. `requestKey` + `requestedBy` carried on every input.
- [x] `packages/domain/src/queue/save-work-order-item-pending-cut-log-diff.ts` (DELETED).
- [x] `packages/domain/src/index.ts` (UPDATED) — dropped the queue file's barrel re-export.

**Plan deviations (recorded):**
- **`assignDraftIds` left intact** in `packages/domain/src/shared/diff-identity.ts`. The plan slated it for deletion, but `git grep` showed it's used by two unrelated flows that are NOT being torn down: `save-work-order-material-items-section.ts` and `save-template-material-items-section.ts`. Only the producer use case (`save-work-order-item-pending-cut-log-diff.ts`) used it for cut logs, and that file is deleted in Phase 4. Helper stays.
- **No `packages/domain/src/queue/index.ts`** existed in the first place — queue file barrels are direct re-exports from `packages/domain/src/index.ts`. The barrel update happened there.
- **New `WorkOrderItemStatus` union narrowing committed in this phase**, even though the plan put the type-level edit alongside the schema. The TS-level narrowing is a domain-layer change and naturally belongs here; coupling it with the data-layer `git status` keeps Phase 0 strictly the schema commit.

**Reuses (no edits):** `assertCutLogLinkageSymmetry`, `assertCutLogDeleteAllowed`, `computeCutCoverage`, `assertCutSumWithinStartingStock`, `assertWorkOrderItemStatusTransition`.

**Verification:**
- [x] `pnpm typecheck` for `@builders/domain` (`tsc -p tsconfig.json --noEmit`) — clean (no output).
- [x] Grep gate: `git grep -E "SAVING_CUTS|save-work-order-item-pending-cut-log-diff|SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF" -- 'packages/domain/'` returns 0 matches.
- [ ] Unit tests for the three new assertion helpers — not yet authored. Will land alongside the application tests in Phase 3 (per repo convention; pure-domain helpers are tested via the use cases that consume them).

**Commit message (when user is ready):**

```
domain(cut-logs): add per-row pending-mutation predicates; drop SAVING_CUTS

- Narrow WorkOrderItemStatus to IDLE | FINALIZING | FAILED. Rebuild
  the transition map accordingly (FAILED still re-enters FINALIZING
  or IDLE; SAVING_CUTS is no longer reachable).
- Add WORK_ORDER_ITEM_NOT_IDLE and CUT_LOG_STALE_UPDATED_AT codes.
- Add pending-mutation-rules.ts with the three assertions the new
  sync use cases (create / update / delete) will call inside their
  TX: WOMI readiness, row-state allowlist (delegates to existing
  assertCutLogDeleteAllowed), and updatedAt OCC check.
- Add CreatePendingCutLogInput / UpdatePendingCutLogInput /
  DeletePendingCutLogInput to work-orders/cut-logs/types.ts.
- Delete the obsolete pending-cut-log-diff queue contract + barrel
  re-export. assignDraftIds stays — used by other flows.
```

**Status:** ✅ done. Domain typecheck green; ready for Phase 2 (Data).

**Notes:**
- The status enum migration in Phase 0 + the union narrowing here together un-block all subsequent phases. Files outside the domain package that still reference `"SAVING_CUTS"` are now provably broken at typecheck time, but those references all live in the producer/consumer use cases (Phase 4 deletion target) or in the section-route (Phase 5 deletion target) or the section UI (Phase 7 deletion target). Build remains red across the whole monorepo until Phase 4 lands; expected.

---

## Phase 2 — Data

**Goal:** Per-row write helpers + a single-call read helper that joins parent inventory; surface the four unit-snapshot fields end-to-end through the read path.

**Plan deviations (approved by user before execution):**
- **`getInventoryForPendingCutLogCreate` not added.** Instead, extended the existing `getInventoryParentContextForCutLogs` to surface the four unit-snapshot fields. One canonical helper, reused by create/update/delete + the still-living diff validator + the finalize path.
- **`CutLogParentContext` (domain type) extended in place** instead of forking a parallel type. Same shape used by every cut-log mutation flow.
- **Diff helpers (`applyWorkOrderItemCutLogPendingDiff`, `getInventoriesForCutLogDiff`, the diff input types) are NOT deleted in Phase 2.** They stay until Phase 4 deletes the producer/consumer use cases that consume them.

**Files (all done):**
- [x] `packages/domain/src/flooring/inventory/cut-logs/types.ts` (UPDATED) — `CutLogRow` extended with `stockUnitName`, `stockUnitAbbrev`, `itemCoverageUnitName`, `itemCoverageUnitAbbrev` (each `string | null`).
- [x] `packages/domain/src/flooring/inventory/cut-logs/diff/types.ts` (UPDATED) — `CutLogParentContext` extended with the same four fields.
- [x] `packages/db/src/flooring/inventory/cut-logs/shared.ts` (UPDATED) — `cutLogRowSelect` selects the four columns.
- [x] `packages/db/src/flooring/inventory/cut-logs/read-repository.ts` (UPDATED):
  - `normalizeCutLogRow` surfaces the four fields.
  - `getInventoryParentContextForCutLogs` reads + returns the four fields.
- [x] `packages/db/src/flooring/work-orders/cut-logs/read-repository.ts` (UPDATED):
  - `workOrderCutLogSelect` selects the four columns.
  - NEW: `getPendingCutLogWithInventoryForMutation(tx, cutLogId)` — single round-trip read using Prisma `select` with a nested `inventory` select. Returns `{ cutLog: CutLogRecord; inventory: CutLogParentContext } | null`.
- [x] `packages/db/src/flooring/work-orders/cut-logs/write-repository.ts` (UPDATED):
  - NEW: `insertPendingCutLogRow(tx, input)` — single-row create. Stamps the four unit-snapshot fields from `input.unitSnapshot`. Returns the normalized record.
  - NEW: `updatePendingCutLogRow(tx, { id, patch })` — single-row update. Patch only ever covers `cut`, `coverageCut`, `isWaste`, `notes`. Empty-patch falls through to a `findUniqueOrThrow` so the caller still gets the row. Returns the normalized record.
  - NEW: `deletePendingCutLogRow(tx, { id })` — single-row delete. Pure persistence call.
  - NEW types exported: `PendingCutLogUnitSnapshot`, `InsertPendingCutLogRowInput`, `UpdatePendingCutLogRowPatch`, `UpdatePendingCutLogRowInput`, `DeletePendingCutLogRowInput`.
- [x] `packages/db/src/flooring/work-orders/material-items/write-repository.ts` (UPDATED) — doc comment on `markWorkOrderItemStatus` rewritten to drop the old `IDLE → SAVING_CUTS` line. Notes that the function is now finalize-only and that pending mutations hold the inventory row lock instead of flipping WOMI status.

**Reuses (no edits):** `lockInventoriesForCutLogBatch(c, [inventoryId])`, `recomputeAndPersistTotalCutSums(c, [inventoryId])`, `getCutLogById`, `listCutLogsForWorkOrderItem*`, `listCutLogsForInventoryIds`.

**Untouched (different flows):** `createCutLogRecord`, `updateCutLogPending`, `voidCutLogRecord`, `applyVoidToCutLog`, `finalizeCutLogRecord`, `finalizeCutLogBatch`, `applyFinalizeWorkOrderCutLogBatch`, `markCutLogsForFinalize`, `markCutLogForVoid`, `applyCutLogPendingSaveDiff`, `updateCutLogLinks`, `deleteCutLogRecordById`.

**Verification:**
- [x] Domain rebuild clean: `tsc -p tsconfig.json` (domain) emits with no errors. (Required because the db package consumes `@builders/domain` from its compiled `dist/` output, not src; type changes need the dist rebuilt before db typecheck sees them.)
- [x] `tsc -p tsconfig.json --noEmit` (domain) — clean.
- [x] `tsc -p tsconfig.json --noEmit` (db) — clean.
- [ ] Repository tests for the three new write helpers + the new read helper — not yet authored. Defer to alongside Phase 3 use case tests.

**Commit message (when user is ready):**

```
data(cut-logs): per-row pending mutation primitives + unit snapshot surface

- Extend CutLogRow + CutLogParentContext with the four unit-snapshot
  fields (stockUnit{Name,Abbrev}, itemCoverageUnit{Name,Abbrev}).
- Plumb through cutLogRowSelect, workOrderCutLogSelect, and
  normalizeCutLogRow so every cut-log read surfaces them.
- Extend getInventoryParentContextForCutLogs to return the four
  fields under the FOR UPDATE lock — one canonical context helper
  reused by create / update / delete / diff validator / finalize.
- Add getPendingCutLogWithInventoryForMutation: single round-trip
  read returning {cutLog, inventory} for the WO-side update + delete
  use cases.
- Add insertPendingCutLogRow / updatePendingCutLogRow /
  deletePendingCutLogRow (single-row WO-side primitives). insert
  stamps the four unit fields from input.unitSnapshot; update never
  writes them, never writes before/after/finalCutSequence/isFinal/
  void/cost/freight/links/cutLogNumber.
- Refresh markWorkOrderItemStatus doc comment — pending flow no
  longer touches WOMI status.
```

**Status:** ✅ done. Domain + db typechecks green. Application package still red (producer/consumer use cases reference deleted symbols) — expected until Phase 4.

**Notes:**
- The db package consumes `@builders/domain` via `file:../domain` (resolved through the domain `dist/` build output), so any domain edit must be followed by `tsc -p packages/domain/tsconfig.json` before re-typechecking db. Phase 1's edits had been compiled into `dist/` only at the time of Phase 1's domain-only typecheck — Phase 2's edits required a fresh build, which surfaced four real errors in db that resolved as soon as the rebuilt `dist/` was in place.
- Snapshot stamping is enforced by shape, not by check: `updatePendingCutLogRow`'s patch type physically does not include the four unit fields, so there is no callsite that could write to them post-create. Same for the worker-only fields (`before`, `after`, `finalCutSequence`, `isFinal`, `void`, `cost`, `freight`).

---

## Phase 3 — Application (3 use cases)

**Goal:** Three new sync use cases; producer + consumer deletion deferred to Phase 4.

**Plan deviations (approved by user before execution):**
- **D1:** dropped `requestKey` and `requestedBy` from `CreatePendingCutLogInput / UpdatePendingCutLogInput / DeletePendingCutLogInput`. They are API-boundary concerns (idempotency receipt + telemetry); the void use case sets the precedent of operational-only inputs.
- **D2:** added `deriveCutLogCoverageCutString` to domain `category-math.ts` — pure string-formatting wrapper around `computeCutCoverage`. Single source of truth, reused by all three use cases.
- **D3:** all three use cases call `validateCutLogPendingForm` before writing — `cut > 0` is now enforced server-side at the use case layer.
- **D4:** application's `types.ts` re-exports the four new domain inputs (`Create / Update / UpdatePatch / Delete`) so consumers that import from `@builders/application` see them.
- **D5:** WOMI status check uses a separate `findUnique` (not bloated into the join helper).
- **D6:** `assertCutSumWithinStartingStock` lets `CutLogDomainError` bubble up unwrapped (matches void); predicate failures (linkage, status, OCC) are wrapped in `WorkOrderCutLogExecutionError`.

**Files (all done):**
- [x] `packages/domain/src/flooring/work-orders/cut-logs/types.ts` (UPDATED) — D1: stripped `requestKey` + `requestedBy` from the three input types.
- [x] `packages/domain/src/flooring/inventory/cut-logs/category-math.ts` (UPDATED) — D2: added `deriveCutLogCoverageCutString({ cut, coveragePerUnit, categorySlug })`.
- [x] `packages/application/src/flooring/work-orders/cut-logs/errors.ts` (UPDATED) — added `WORK_ORDER_ITEM_NOT_IDLE`, `WORK_ORDER_CUT_LOG_NOT_PENDING`, `WORK_ORDER_CUT_LOG_STALE` to `WorkOrderCutLogErrorCode`.
- [x] `packages/application/src/flooring/work-orders/cut-logs/types.ts` (UPDATED) — D4: re-export of `CreatePendingCutLogInput`, `UpdatePendingCutLogInput`, `UpdatePendingCutLogPatch`, `DeletePendingCutLogInput` from `@builders/domain`.
- [x] `packages/application/src/flooring/work-orders/cut-logs/create-pending-cut-log.ts` (NEW) — single TX flow:
  1. `validateCutLogPendingForm` → 400 on issues.
  2. Read WOMI; assert ownership + `status === IDLE`.
  3. `assertCutLogLinkageSymmetry`.
  4. `lockInventoriesForCutLogBatch(c, [inventoryId])`.
  5. `getInventoryParentContextForCutLogs` (post-lock).
  6. `deriveCutLogCoverageCutString`.
  7. `insertPendingCutLogRow` — stamps the four unit-snapshot fields from inventory.
  8. `recomputeAndPersistTotalCutSums` + `assertCutSumWithinStartingStock`.
- [x] `packages/application/src/flooring/work-orders/cut-logs/update-pending-cut-log.ts` (NEW) — single TX flow:
  1. Read WOMI; assert ownership + IDLE.
  2. `getPendingCutLogWithInventoryForMutation` — single round-trip read.
  3. Linkage check + `assertCutLogPendingMutationAllowed` (final cuts can't be edited via this path) + `assertCutLogExpectedUpdatedAtMatches` (OCC).
  4. `assertCutLogLinkageSymmetry`.
  5. `validateCutLogPendingForm` against the merged post-patch state (cut, isWaste, notes).
  6. `lockInventoriesForCutLogBatch(c, [inventoryId])`.
  7. Re-derive `coverageCut` only when `cut` changed.
  8. `updatePendingCutLogRow` — patch carries only the user-editable fields.
  9. `recomputeAndPersistTotalCutSums` + invariant.
- [x] `packages/application/src/flooring/work-orders/cut-logs/delete-pending-cut-log.ts` (NEW) — single TX flow:
  1. Read WOMI; assert ownership + IDLE.
  2. `getPendingCutLogWithInventoryForMutation`.
  3. Linkage + PENDING-only (`assertCutLogPendingMutationAllowed` mapped to `WORK_ORDER_CUT_LOG_DELETE_NOT_ALLOWED` here — final cuts can only be voided) + OCC.
  4. `assertCutLogLinkageSymmetry`.
  5. `lockInventoriesForCutLogBatch(c, [inventoryId])`.
  6. `deletePendingCutLogRow`.
  7. `recomputeAndPersistTotalCutSums` + invariant (defense-in-depth — total only decreases on delete).
- [x] `packages/application/src/flooring/work-orders/cut-logs/index.ts` (UPDATED) — added barrel exports for the three new files. Producer + consumer files **still exported** — they get deleted in Phase 4.

**Each use case:**
- Opens TX via `withDatabaseTransaction`, accepts optional `client?: Prisma.TransactionClient`.
- Imports only from `@builders/domain` and `@builders/db` (per [packages/application/CLAUDE.md](packages/application/CLAUDE.md) rule 1).
- No outbox writes, no WOMI status flip — the TX holds the inventory row lock for the duration; sync end-to-end.
- Returns the post-mutation row(s): create + update return `{ cutLog, inventoryId, totalCutSum }`; delete returns `{ deletedId, inventoryId, totalCutSum }`.

**Verification:**
- [x] Domain rebuild: `tsc -p packages/domain/tsconfig.json` — clean.
- [x] DB rebuild: `tsc -p packages/db/tsconfig.json` — clean.
- [x] Application typecheck: errors are entirely in two files — `save-work-order-item-pending-cut-log-diff.ts` (producer) and `apply-work-order-item-pending-cut-log-diff.ts` (consumer). Both are Phase 4 deletion targets. **Zero errors in any of the three new use cases, the new error codes, the type re-exports, or the barrel.** Confirmed via `tsc ... 2>&1 | grep -oE 'src/[^ ]+\\.ts' | sort -u` — output limited to those two files.

| File | Errors |
|---|---|
| `create-pending-cut-log.ts` | 0 |
| `update-pending-cut-log.ts` | 0 |
| `delete-pending-cut-log.ts` | 0 |
| `errors.ts`, `types.ts`, `index.ts` | 0 |
| `save-work-order-item-pending-cut-log-diff.ts` (Phase 4 target) | references deleted topic + payload schema + `"SAVING_CUTS"` |
| `apply-work-order-item-pending-cut-log-diff.ts` (Phase 4 target) | references deleted payload type |

- [ ] Unit tests per use case — not yet authored. Will land alongside Phase 5 routes (test the use case via the API path).

**Commit message (when user is ready):**

```
application(cut-logs): add sync per-row create / update / delete use cases

- New: createPendingCutLogUseCase, updatePendingCutLogUseCase,
  deletePendingCutLogUseCase. Each opens its own TX, asserts WOMI
  ownership + IDLE, takes the parent inventory FOR UPDATE lock,
  applies the mutation, recomputes totalCutSum, and asserts
  totalCutSum <= startingStock. No outbox writes; sync end-to-end.
- New error codes: WORK_ORDER_ITEM_NOT_IDLE,
  WORK_ORDER_CUT_LOG_NOT_PENDING, WORK_ORDER_CUT_LOG_STALE.
- Domain: drop requestKey / requestedBy from the per-row input
  types (API-boundary concerns); add deriveCutLogCoverageCutString
  pure helper alongside computeCutCoverage.
- Application types.ts re-exports the four new domain inputs so
  the API-route validators (Phase 6) can keep importing from
  @builders/application.
- Producer + consumer use cases (save / apply *-diff.ts) still
  present and barreled — Phase 4 deletes them. Application
  typecheck is currently red on those two files only; new use
  cases compile clean.
```

**Status:** ✅ done. New use cases compile and are ready for Phase 4 worker dismantle (which removes the two remaining red files) and Phase 5 API routes.

**Notes:**
- The producer + consumer files reference deleted symbols (`SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_TOPIC`, `SaveWorkOrderItemPendingCutLogDiffPayloadSchema`, `"SAVING_CUTS"`). They have NOT been edited or stubbed in this phase — they are Phase 4's deletion targets. Per CLAUDE.md commit boundaries, application work and worker dismantle are separate concerns.
- Domain rule preserved: domain never imports from application or db. All cross-layer flow is via `@builders/domain` → `@builders/application` → `@builders/db` (with the carve-out that data-layer normalizers may import pure domain helpers — exercised here by `deriveCutLogCoverageCutString` on the use case side, not the data side).

---

## Phase 4 — Outbox / Relay / Worker dismantle

**Goal:** Tear down the entire pending-cut-log async pipeline (processor + dispatcher + relay registration + producer/consumer use cases) and clean up the orphaned data-layer diff helpers Phase 2 deferred. Imports + finalize + file-generation workers are untouched.

**Plan deviations (in scope, signaled before execution):**
- **Data-layer cleanup landed here**, not Phase 2: `applyWorkOrderItemCutLogPendingDiff`, `getInventoriesForCutLogDiff`, and the four input types (`WorkOrderCutLogPending{Draft,Update,Delete}Input`, `ApplyWorkOrderItemCutLogPendingDiffInput`) deleted from `packages/db/src/flooring/work-orders/cut-logs/{read,write}-repository.ts`. Documented in the Phase 2 execution log.
- **Orphaned application types deleted:** `SaveWorkOrderItemPendingCutLogDiffInput` + `SaveWorkOrderItemPendingCutLogDiffResult` in `packages/application/src/flooring/work-orders/cut-logs/types.ts` were tied 1:1 to the deleted producer use case.
- **Worker env.ts cleanup:** the dismantled processor's two env entries (`WORK_ORDER_PENDING_CUT_LOG_WORKER_CONCURRENCY`, `WORK_ORDER_PENDING_CUT_LOG_WORKER_LOCK_DURATION_MS`) and their projected fields (`workOrderPendingCutLog{Concurrency,LockDurationMs}`) are removed. Out-of-the-box for the plan, but bootstrap.ts wouldn't typecheck otherwise (those env fields are read by the deleted block).

**Files (all done):**

DELETED (4):
- [x] `apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts`
- [x] `apps/relay/src/dispatch/build-save-work-order-item-pending-cut-log-dispatcher.ts`
- [x] `packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts`
- [x] `packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts` (also took `markWorkOrderItemFailedFromCutLogDiff` with it)

EDITED (8):
- [x] `apps/worker/src/bootstrap.ts` — removed: import line for the handler factory; queue + payload type imports from `@builders/domain`; the entire pending-cut-log construction + listener block (~80 lines); `waitUntilReady`, `run()`, ready-log queue/concurrency/lockDuration entries, and shutdown `close()` calls. Imports + finalize + file-gen blocks untouched.
- [x] `apps/worker/src/env.ts` — removed: `WORK_ORDER_PENDING_CUT_LOG_WORKER_*` from the zod schema, the type fields, the parse-input map, and the projection.
- [x] `apps/relay/src/dispatch/dispatchers.ts` — removed: import + the `buildSaveWorkOrderItemPendingCutLogDispatcher(connection)` registration.
- [x] `packages/application/src/flooring/work-orders/cut-logs/index.ts` — removed: barrel exports for the 2 deleted use case files.
- [x] `packages/application/src/flooring/work-orders/cut-logs/types.ts` — removed: `SaveWorkOrderItemPendingCutLogDiffInput`, `SaveWorkOrderItemPendingCutLogDiffResult`.
- [x] `packages/db/src/flooring/work-orders/cut-logs/write-repository.ts` — removed: `applyWorkOrderItemCutLogPendingDiff` function + the four input types.
- [x] `packages/db/src/flooring/work-orders/cut-logs/read-repository.ts` — removed: `getInventoriesForCutLogDiff`.

KEPT (untouched, per scope):
- `apps/worker/src/processors/materialize-import-batch.ts` (imports worker)
- `apps/worker/src/processors/finalize-work-order-cut-log-batch.ts` (finalize worker)
- `apps/worker/src/processors/work-order-file-generation.ts` (file-generation worker — incomplete per user; explicitly out of scope)
- `apps/relay/src/dispatch/build-{materialize-import,finalize-work-order-cut-log,work-order-file-generation}-dispatcher.ts`
- All cut-log domain rules (`assertCutLog*`, `computeCutCoverage`, `assertCutSumWithinStartingStock`, etc.)
- Application's diff types (`WorkOrderCutLogPendingDraft`, `WorkOrderCutLogPendingUpdate`, `WorkOrderCutLogPendingDelete`, `WorkOrderCutLogPendingDiff`) — still consumed by the validator + UI hook; deletion targets in Phase 6 + 7.

**Grep gate — all clean (zero source matches):**

| Search | Source matches |
|---|---|
| `flooring.work-order-item.pending-cut-log.save` | 1 (doc-comment in `apps/web/.../section/route.ts` — Phase 5 target) |
| `flooring-work-order-item-pending-cut-log-diff` | 0 |
| `wo-pcl-diff:` | 0 |
| `saveWorkOrderItemPendingCutLogDiffUseCase` | 1 import + 2 refs (all in `apps/web/.../section/route.ts` — Phase 5 target) |
| `applyWorkOrderItemPendingCutLogDiffUseCase` | 0 |
| `markWorkOrderItemFailedFromCutLogDiff` | 0 |
| `applyWorkOrderItemCutLogPendingDiff` | 0 |
| `getInventoriesForCutLogDiff` | 0 |
| `buildSaveWorkOrderItemPendingCutLogDispatcher` | 0 |

**Build state after Phase 4:**

| Package | Typecheck |
|---|---|
| `@builders/domain` | ✅ green (untouched this phase) |
| `@builders/db` | ✅ green |
| `@builders/application` | ✅ green |
| `apps/worker` | ✅ green |
| `apps/relay` | ✅ green |
| `apps/web` | ❌ 2 errors, both expected: `section/route.ts` (Phase 5 target) imports the deleted producer use case; `work-order-material-items-section.tsx:44` (Phase 7 target) still has a `case "SAVING_CUTS":` branch in a switch over the narrowed `WorkOrderItemStatus`. |

**Commit message (when user is ready):**

```
worker(cut-logs): dismantle pending cut-log worker / relay / outbox

- Delete the BullMQ processor + relay dispatcher + producer +
  consumer use cases. The pending-cut-log queue, topic, and
  idempotency prefix are now unused everywhere.
- bootstrap.ts: strip the pending-cut-log Worker construction,
  event listeners, waitUntilReady / run / shutdown entries, and
  the ready-log queue / concurrency / lockDuration fields.
  env.ts loses its two paired env entries.
- dispatchers.ts: drop buildSaveWorkOrderItemPendingCutLogDispatcher
  from the topic registry.
- application/cut-logs/types.ts: drop orphaned
  SaveWorkOrderItemPendingCutLogDiffInput/Result.
- db/work-orders/cut-logs: drop applyWorkOrderItemCutLogPendingDiff
  + getInventoriesForCutLogDiff + their four input types
  (deferred from Phase 2 — only the deleted consumer used them).
- Imports + finalize + file-generation workers untouched.
- apps/web is currently red on section/route.ts (Phase 5 target)
  and the UI section's "SAVING_CUTS" switch case (Phase 7 target);
  every other package is green.
```

**Status:** ✅ done. Worker + relay + application + db all typecheck clean. Pending cut-log queue + topic + dispatcher + processor + use cases are gone end-to-end. Workers staying: imports, finalize, file-generation.

**Notes:**
- The `cut-logs/pending-cut-log-worker.md` file is historical; not deleted (the user has it for reference). It's superseded by this sweep's plan + execution.
- Outbox `flooring_queue_outbox_event` rows whose `topic = 'flooring.work-order-item.pending-cut-log.save'` may still exist in the DB if any were written before Phase 4 lands. They will never dispatch (no relay registration). Cleanup is a one-line SQL `DELETE FROM ... WHERE topic = ...` if/when desired — not required for correctness, since unread rows just sit there. Out-of-scope for this sweep.
- `apps/worker/dist` and `apps/relay/dist` artifacts matching `*pending*cut*log*` will regenerate on next build (now empty); not hand-deleted per the plan.

---

## Phase 5 — API routes

**Files:**
- [ ] `apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/route.ts` (NEW — POST)
- [ ] `apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/[cutLogId]/route.ts` (NEW — PATCH + DELETE)
- [ ] `apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/section/route.ts` (DELETED)

**Each route:** `applyRoutePolicy` → `parseUuidParam(s)` → `parseMutationEnvelope` → `enforceMutationReceipt` → `withMutationTelemetry(... use case ...)` → `finalizeMutationReceipt` → `routeJson(200)` / `routeError`.

**DELETE-body resolution check:** at the start of this phase, confirm `parseMutationEnvelope` parses DELETE bodies (open question #1). If not, fall back to header-based `requestKey` + `expectedUpdatedAt`. Decision recorded here:
- _resolution: pending_

**Receipt scopes:**
- `work-orders.material-items.pending-cut-logs.create`
- `work-orders.material-items.pending-cut-logs.update`
- `work-orders.material-items.pending-cut-logs.delete`

**Rate limits:** mirror today's section route — `limit: 50, windowMs: 10 * 60 * 1000`, capability `system.access`, tool slug `WORK_ORDERS_TOOL_SLUG`.

**Verification:**
- [ ] `pnpm typecheck` for `apps/web` clean.
- [ ] Manual curl: each route returns 200 with the expected body shape.

**Status:** _not started_

**Notes:**
- _empty until execution_

---

## Phase 6 — Validators

**File:** `apps/web/app/api/work-orders/_validators.ts`

- [ ] DELETE: `validateWorkOrderItemPendingCutLogDiffInput`, `ValidatedWorkOrderItemPendingCutLogDiffInput`, `validatePendingDraft`, `validatePendingUpdate`, `validatePendingDelete`.
- [ ] ADD: `validateCreatePendingCutLogInput`, `validateUpdatePendingCutLogInput`, `validateDeletePendingCutLogInput`.

**Verification:**
- [ ] `pnpm typecheck` clean.
- [ ] Validator unit tests cover empty patches, missing required fields, malformed payloads.

**Status:** _not started_

**Notes:**
- _empty until execution_

---

## End-of-sweep verification

- [ ] `pnpm typecheck` clean across the monorepo.
- [ ] `pnpm test` clean across cut-log packages and routes.
- [ ] Manual integration check covering the matrix in the plan's Verification section.
- [ ] BullMQ console after restart shows no `flooring-work-order-item-pending-cut-log-diff` queue.
- [ ] No new outbox rows with topic `flooring.work-order-item.pending-cut-log.save`.

---

## Open issues found during execution

_To be filled in as work proceeds. Issues that don't fit a single phase land here. If any cleanup is needed against this log after execution, a `cleanup-2026-05-01-pending-cut-logs-sync.md` file is created and the items are checklisted there._

---

## Headlines (chat-paste form, updated as phases finish)

| Phase | Status | Files touched | Errors | Notes |
|---|---|---|---|---|
| 0 — Schema | ✅ committed + applied | `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260501190000_drop_work_order_item_status_saving_cuts/migration.sql` | 0 | Migration deployed to Railway Postgres. Monorepo typecheck expected red until Phase 1 + 4 land. |
| 1 — Domain | ✅ done (uncommitted) | `material-items/types.ts`, `material-items/status-rules.ts`, `work-orders/errors.ts`, `inventory/cut-logs/errors.ts`, `inventory/cut-logs/pending-mutation-rules.ts` (NEW), `inventory/cut-logs/index.ts`, `work-orders/cut-logs/types.ts`, `queue/save-work-order-item-pending-cut-log-diff.ts` (DELETED), `src/index.ts` | 0 | Domain typecheck green. `assignDraftIds` kept (used by other flows). Monorepo typecheck still red — fixes land Phase 2/3/4. |
| 2 — Data | ✅ done (uncommitted) | `domain/inventory/cut-logs/types.ts`, `domain/inventory/cut-logs/diff/types.ts`, `db/inventory/cut-logs/shared.ts`, `db/inventory/cut-logs/read-repository.ts`, `db/work-orders/cut-logs/read-repository.ts`, `db/work-orders/cut-logs/write-repository.ts`, `db/work-orders/material-items/write-repository.ts` | 0 | Domain + db typechecks green. App package still red (producer/consumer) — expected until Phase 4. |
| 3 — Application | ✅ done (uncommitted) | `domain/work-orders/cut-logs/types.ts`, `domain/inventory/cut-logs/category-math.ts`, `application/work-orders/cut-logs/{errors,types,index}.ts`, `application/work-orders/cut-logs/{create,update,delete}-pending-cut-log.ts` (3 NEW) | 0 in new code; 11 in Phase 4 deletion targets (expected) | New use cases compile clean. Red errors all in producer/consumer files Phase 4 will delete. |
| 4 — Worker dismantle | ✅ done (uncommitted) | 4 deleted (worker processor, relay dispatcher, producer + consumer use cases); 7 edited (worker bootstrap + env, relay dispatchers, application barrel + types, db read + write repos) | 0 | Domain, db, application, worker, relay all green. apps/web red on Phase 5 + 7 targets only. |
| 5 — API routes | _not started_ | — | — | — |
| 6 — Validators | _not started_ | — | — | — |
