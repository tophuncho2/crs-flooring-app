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
- [ ] `packages/domain/src/flooring/inventory/cut-logs/pending-mutation-rules.ts` (NEW)
  - `assertWorkOrderItemReadyForCutLogMutation(womi)` → `WORK_ORDER_ITEM_NOT_IDLE` (409) if status !== IDLE
  - `assertCutLogPendingMutationAllowed(row)` → `WORK_ORDER_CUT_LOG_NOT_PENDING` (409)
  - `assertCutLogExpectedUpdatedAtMatches({ row, expected })` → `WORK_ORDER_CUT_LOG_STALE` (409)
- [ ] `packages/domain/src/flooring/inventory/cut-logs/index.ts` (UPDATED — barrel)
- [ ] `packages/domain/src/flooring/work-orders/cut-logs/types.ts` (UPDATED — add per-row input types)
- [ ] `packages/domain/src/queue/save-work-order-item-pending-cut-log-diff.ts` (DELETED)
- [ ] `packages/domain/src/queue/index.ts` (UPDATED — drop re-exports)
- [ ] `assignDraftIds` removed from domain barrel (no longer used).

**Reuses (no edits):** `assertCutLogLinkageSymmetry`, `assertCutLogDeleteAllowed`, `computeCutCoverage`, `assertCutSumWithinStartingStock`.

**Verification:**
- [ ] `pnpm typecheck` for `@builders/domain` clean.
- [ ] Unit tests for the three new assertion helpers pass.

**Status:** _not started_

**Notes:**
- _empty until execution_

---

## Phase 2 — Data

**Goal:** Per-row write helpers + a single-call read helper that joins parent inventory.

**Files:**
- [ ] `packages/db/src/flooring/work-orders/cut-logs/write-repository.ts`
  - `insertPendingCutLogRow(c, input)` (NEW) — stamps the four unit-snapshot fields from input
  - `updatePendingCutLogRow(c, { id, patch })` (NEW) — never writes immutable fields
  - `deletePendingCutLogRow(c, { id })` (NEW)
  - `applyWorkOrderItemCutLogPendingDiff` (DELETED)
- [ ] `packages/db/src/flooring/work-orders/cut-logs/read-repository.ts`
  - `getPendingCutLogWithInventoryForMutation(c, cutLogId)` (NEW)
  - `getInventoryForPendingCutLogCreate(c, inventoryId)` (NEW)
- [ ] `packages/db/src/flooring/work-orders/cut-logs/index.ts` (UPDATED — barrel)

**Reuses:** `lockInventoriesForCutLogBatch(c, [inventoryId])`, `recomputeAndPersistTotalCutSums(c, [inventoryId])`.

**Verification:**
- [ ] `pnpm typecheck` for `@builders/db` clean.
- [ ] Repository tests cover insert/update/delete + the snapshot-immutable contract on update.

**Status:** _not started_

**Notes:**
- _empty until execution_

---

## Phase 3 — Application (3 use cases)

**Goal:** Three new sync use cases; delete the producer + consumer.

**Files:**
- [ ] `packages/application/src/flooring/work-orders/cut-logs/create-pending-cut-log.ts` (NEW)
- [ ] `packages/application/src/flooring/work-orders/cut-logs/update-pending-cut-log.ts` (NEW)
- [ ] `packages/application/src/flooring/work-orders/cut-logs/delete-pending-cut-log.ts` (NEW)
- [ ] `packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts` (DELETED)
- [ ] `packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts` (DELETED)
- [ ] `packages/application/src/flooring/work-orders/cut-logs/types.ts` (UPDATED — drop diff types, add per-row types)
- [ ] `packages/application/src/flooring/work-orders/cut-logs/index.ts` (UPDATED — barrel)
- [ ] `markWorkOrderItemFailedFromCutLogDiff` deleted (used only by the deleted worker).

**Each use case:**
1. Opens TX via `withDatabaseTransaction`, accepts optional `client`.
2. Loads WOMI, asserts `status === 'IDLE'` (`assertWorkOrderItemReadyForCutLogMutation`) and `workOrderId` ownership.
3. `assertCutLogLinkageSymmetry`.
4. (update/delete) load row + parent inventory in one round trip; assert linkage, OCC, and PENDING status.
5. Lock parent inventory `FOR UPDATE` via `lockInventoriesForCutLogBatch(c, [inventoryId])`.
6. (create) read inventory under lock; (update with `cut` change) re-derive `coverageCut`.
7. Write the row via the appropriate write helper.
8. `recomputeAndPersistTotalCutSums(c, [inventoryId])` + `assertCutSumWithinStartingStock`.
9. Return the post-mutation row (or `{ deletedId, inventoryId, totalCutSum }`).

No outbox writes, no WOMI status flip.

**Verification:**
- [ ] `pnpm typecheck` for `@builders/application` clean.
- [ ] Unit tests per use case covering: happy path, OCC mismatch, status non-IDLE, final row delete attempt, linkage mismatch, invariant violation.

**Status:** _not started_

**Notes:**
- _empty until execution_

---

## Phase 4 — Outbox / Relay / Worker dismantle

**Files:**
- [ ] `apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts` (DELETED)
- [ ] `apps/worker/src/bootstrap.ts` (UPDATED — strip pending-diff worker block)
- [ ] `apps/relay/src/dispatch/build-save-work-order-item-pending-cut-log-dispatcher.ts` (DELETED)
- [ ] `apps/relay/src/dispatch/dispatchers.ts` (UPDATED — drop registration)

**Grep gate (run before declaring Phase 4 done):**
- [ ] `git grep "SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF"` returns 0 source matches.
- [ ] `git grep "flooring.work-order-item.pending-cut-log.save"` returns 0 source matches.
- [ ] `git grep "flooring-work-order-item-pending-cut-log-diff"` returns 0 source matches.
- [ ] `git grep "wo-pcl-diff:"` returns 0 source matches.

(Docs / sessions / `cut-logs/pending-cut-log-worker.md` references are allowed — those are historical.)

**Verification:**
- [ ] `pnpm build` clean for `apps/worker` + `apps/relay`.
- [ ] Worker boot log shows only the finalize and imports queues.

**Status:** _not started_

**Notes:**
- _empty until execution_

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
| 1 — Domain | _not started_ | — | — | — |
| 2 — Data | _not started_ | — | — | — |
| 3 — Application | _not started_ | — | — | — |
| 4 — Worker dismantle | _not started_ | — | — | — |
| 5 — API routes | _not started_ | — | — | — |
| 6 — Validators | _not started_ | — | — | — |
