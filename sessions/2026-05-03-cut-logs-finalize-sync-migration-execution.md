# Execution — cut-log finalize sync migration

Plan: [2026-05-03-cut-logs-finalize-sync-migration-plan.md](2026-05-03-cut-logs-finalize-sync-migration-plan.md)

## Status

- [x] Step 1 — Application: rewrite producer as sync use case; delete apply file
- [x] Step 2 — Relay teardown
- [x] Step 3 — Worker teardown
- [x] Step 4 — Domain queue contract delete
- [x] Step 5 — Validator
- [x] Step 6 — API route
- [x] Step 7 — Transport
- [x] Step 8 — Controller
- [x] Verification (typecheck + tests + grep)
- [x] Commit message drafted (not committed)

## Pre-execution verification

- 10 files reference `FINALIZE_WORK_ORDER_CUT_LOG` / `FinalizeWorkOrderCutLogPayload` / the file slug — exactly the set the plan covers.
- `getCutLogById(id, client?)` exists at [packages/db/src/flooring/inventory/cut-logs/read-repository.ts:92](packages/db/src/flooring/inventory/cut-logs/read-repository.ts:92) and returns `CutLogRecord | null` — used for the post-finalize response re-read.
- `applyFinalizeWorkOrderCutLog` at [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:69](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:69) returns `{ stampedRow: FinalizeStampedRow | null }` — caller asserts `before − cut === after`.
- `WorkOrderCutLogExecutionError` codes (`WORK_ORDER_CUT_LOG_NOT_FOUND`, `_LINKAGE_MISMATCH`, `_FINALIZE_BLOCKED`) all exist in [packages/application/src/flooring/work-orders/cut-logs/errors.ts](packages/application/src/flooring/work-orders/cut-logs/errors.ts).

## Per-step notes

### Step 1 — Application

- Rewrote [packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log.ts](packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log.ts) as the sync flow. Single TX: read inventory id → `lockInventoryForCutLog` → re-read full row under lock → linkage + finalizability checks → `applyFinalizeWorkOrderCutLog` → `assertBeforeCutAfterInvariant` → `getCutLogById` for canonical response shape.
- Replay-tolerance no-op paths from the old apply use case removed — sync flow surfaces every failure as a terminal HTTP response.
- Errors: 404 for missing row, 400 for linkage mismatch (matches old producer), 409 for `canFinalizeCutLog === false` (carries the double-click protection role formerly held by `requestKey`).
- Updated [packages/application/src/flooring/work-orders/cut-logs/types.ts](packages/application/src/flooring/work-orders/cut-logs/types.ts): `FinalizeWorkOrderCutLogInput` is `{ workOrderId, cutLogId }`; `FinalizeWorkOrderCutLogResult` is `{ cutLog: CutLogRecord }`. Dropped `RequestedBy` (no remaining consumers in this file's exports).
- Deleted `apply-finalize-work-order-cut-log.ts` and removed its `index.ts` re-export.

### Step 2 — Relay

- Deleted `apps/relay/src/dispatch/build-finalize-work-order-cut-log-dispatcher.ts`.
- Removed import + entry from [apps/relay/src/dispatch/dispatchers.ts](apps/relay/src/dispatch/dispatchers.ts). Sibling dispatchers untouched.

### Step 3 — Worker

- Deleted `apps/worker/src/processors/finalize-work-order-cut-log.ts`, `apps/worker/tests/finalize-work-order-cut-log.test.ts`, `apps/worker/diag-inspect.mjs`.
- Removed the entire finalize worker setup block + waitUntilReady + run + log queues entry + close handler from [apps/worker/src/bootstrap.ts](apps/worker/src/bootstrap.ts). Sibling workers (materialize, file generation) untouched.
- Removed `WORK_ORDER_FINALIZE_CUT_LOG_WORKER_*` env vars (schema, type, parser, return) from [apps/worker/src/env.ts](apps/worker/src/env.ts).
- `grep diag-inspect` confirmed only sessions/ docs reference it — safe to delete.

### Step 4 — Domain queue contract

- Deleted [packages/domain/src/queue/finalize-work-order-cut-log.ts](packages/domain/src/queue/finalize-work-order-cut-log.ts).
- Removed re-export from [packages/domain/src/index.ts](packages/domain/src/index.ts).

### Step 5 — Validator

- [apps/web/app/api/work-orders/_validators.ts](apps/web/app/api/work-orders/_validators.ts): dropped `requestKey` from `ValidatedFinalizeWorkOrderCutLogInput` and the validator function.

### Step 6 — API route

- Rewrote [apps/web/app/api/work-orders/[id]/cut-logs/finalize/route.ts](apps/web/app/api/work-orders/[id]/cut-logs/finalize/route.ts): drop `requestedBy`, drop the 202 response, drop the `{ finalize: ... }` wrapper. Returns 200 with `{ cutLog }`.
- Telemetry message updated to "Work-order cut-log finalized" (action scope unchanged).
- `entityType` changed from `flooringWorkOrder` to `flooringCutLog` and `entityId` from `workOrderId` to `input.cutLogId` since the operation is now a single-row mutation, not a queue dispatch.

### Step 7 — Transport

- [apps/web/modules/work-orders/data/mutations.ts](apps/web/modules/work-orders/data/mutations.ts): `FinalizeCutLogResponse` is `{ cutLog: CutLogRow }`; `finalizeWorkOrderCutLogRequest` no longer takes `requestKey`.

### Step 8 — Controller

- [apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts](apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts): `finalizeMutation` no longer mints `requestKey: ${cutLogId}:${Date.now()}`. `onSuccess` publishes the real stamped row from the response instead of an optimistic `{ status: "FINAL", isFinal: true }` patch.
- `FlooringCutLogStatus` import retained — still used by the void mutation's optimistic patch.

## Verification results

| Check | Result |
| --- | --- |
| `npm run typecheck` (all 8 packages) | green |
| `npm test --workspace @builders/worker` | 3/3 passed (finalize handler test correctly removed; materialize handler test untouched) |
| `npm test --workspace @builders/relay` | 6/6 passed |
| `npm test --workspace @builders/web` | 154 passed / 18 failed — **all 18 failures pre-exist on baseline** (verified via `git stash` round-trip). Failing files: `tests/shared/package-scripts`, `tests/engines/record-view/*`, `tests/modules/imports/*`, `tests/modules/products/products-detail-client`, `tests/server/auth/route-auth`, `tests/server/http/route-helpers`. None touch cut logs / finalize / requestKey. |
| `grep -rn FINALIZE_WORK_ORDER_CUT_LOG ...` across `apps/` + `packages/` | Only one residual hit — `packages/application/src/flooring/work-orders/cut-logs/index.ts:6` exporting the rewritten sync use case file. |
| `grep -rn diag-inspect` | Only sessions/ docs (now-deleted file). |

## Concerns / out-of-scope flags carried forward from the plan

1. **Rate limit raise** — applied in the same sweep at user request. All five cut-log routes were sized for the old async world; now that they're all sync, bumped to comfortable per-user/10-min ceilings:

   | Route | Scope | Old | New |
   | --- | --- | --- | --- |
   | Create | `work-orders.cut-logs.pending.create` | 120 | 600 |
   | Update | `work-orders.cut-logs.pending.update` | 240 | 1200 |
   | Delete | `work-orders.cut-logs.pending.delete` | 120 | 600 |
   | Finalize | `work-orders.cut-logs.finalize` | 30 | 600 |
   | Void | `work-orders.cut-logs.void` | 60 | 300 |

   Bucketing is per-authenticated-user, per-scope, per-10-min window ([apps/web/server/http/route-helpers.ts:46](apps/web/server/http/route-helpers.ts:46) — falls back to client IP if unauthenticated).

2. **Doc nit (out of scope):** [packages/domain/src/flooring/work-orders/cut-logs/types.ts:24](packages/domain/src/flooring/work-orders/cut-logs/types.ts:24) has a doc comment that names `requestKey` and `requestedBy` as illustrative examples of API-boundary concerns. The principle still holds (those concerns *are* handled by `enforceMutationReceipt` + `applyRoutePolicy`), but the named examples no longer exist in this codebase. Left untouched to keep this sweep hardscoped — flagging for a future cleanup.
3. **Deploy-time backlog cleanup — DEFERRED (per user, 2026-05-03).** Any `queue_outbox_event` rows still PENDING/PROCESSING for `topic = 'flooring.work-order.cut-log.finalize'` after deploy are orphaned (no relay polls, no worker drains). Not harmful — no errors, no retries — just stale rows in the outbox table. When ready to tidy up, run once against the live DB:

   ```sql
   UPDATE queue_outbox_event
   SET status = 'EXHAUSTED'
   WHERE topic = 'flooring.work-order.cut-log.finalize'
     AND status IN ('PENDING', 'PROCESSING');
   ```

   (No `exhausted_at` column exists — `updatedAt` updates automatically.) The Redis BullMQ queue `flooring-work-order-cut-log-finalize` can also be deleted post-deploy — BullMQ tolerates orphan queues.

## Manual smoke test checklist (run before/after deploy)

- [ ] Open work-order record view → expand a material item with a PENDING cut log → click Finalize.
- [ ] Network response is **200** (not 202) with body `{ cutLog: { ..., status: "FINAL", before, after, finalCutSequence } }`.
- [ ] Side panel closes.
- [ ] Row in the section reflects FINAL with the real `before` / `after` / `finalCutSequence` (not optimistic).
- [ ] `SELECT COUNT(*) FROM flooring_outbox_event WHERE topic = 'flooring.work-order.cut-log.finalize' AND created_at > now() - interval '5 minutes';` returns 0.
- [ ] Open the same row in two tabs and finalize in both — second call returns 409 with `payload.code = "WORK_ORDER_CUT_LOG_FINALIZE_BLOCKED"`.

## Commit message (do NOT commit — for user)

```
refactor(work-orders/cut-logs): make finalize fully synchronous

Rip out the producer/outbox/relay/worker pipeline and execute finalize
inline under the parent inventory's row lock. The response carries the
stamped row so the controller no longer optimistically lies about
status. Idempotency comes from the canFinalizeCutLog predicate (rejects
already-FINAL rows with 409) plus the existing mutation-receipt window;
the per-attempt requestKey is removed from the wire.

Layer-ordered:
- application: rewrite finalize-work-order-cut-log.ts as a single sync TX
  (lock inventory FOR UPDATE -> re-read row -> validate -> applyFinalize
  data primitive -> assert invariant -> re-read canonical row); fold the
  apply use case in and delete it.
- relay: delete the finalize dispatcher and its registration.
- worker: delete the processor, its test, the diag-inspect script,
  the bootstrap setup block, and the WORK_ORDER_FINALIZE_CUT_LOG_*
  env vars.
- domain: delete the queue contract (topic, payload schema) and its
  re-export from the package barrel.
- api/validator: drop requestKey, return 200 with { cutLog }.
- transport/controller: drop requestKey + the optimistic FINAL patch;
  publish the real stamped row from the response.

After deploy: mark any orphaned flooring_outbox_event rows for the
flooring.work-order.cut-log.finalize topic as EXHAUSTED (sql in
sessions/2026-05-03-cut-logs-finalize-sync-migration-execution.md).
```
