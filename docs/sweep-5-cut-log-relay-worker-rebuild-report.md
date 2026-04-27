# Sweep 5 — Cut-Log Relay Dispatchers + Worker Handlers Report

**Date:** 2026-04-26
**Plan:** `~/.claude/plans/take-a-look-at-functional-falcon.md`
**Reference template:** the staged-inv import job pipeline ([apps/relay/src/dispatch/build-materialize-import-dispatcher.ts](../apps/relay/src/dispatch/build-materialize-import-dispatcher.ts) + [apps/worker/src/processors/materialize-import-batch.ts](../apps/worker/src/processors/materialize-import-batch.ts)).
**Sweep doc:** `docs/sweeps/alteration/6_modules_directory.md` (still empty placeholder; file naming is from the original ordering — this report supersedes; for canonical sweep order see `docs/sweep-4-cut-log-application-rebuild-report.md` "Out of scope" section).
**Branch:** `staging`

## Headlines

- **Relay dispatchers shipped (3 new):** `build-pending-save-cut-log-dispatcher.ts`, `build-finalize-cut-log-dispatcher.ts`, `build-void-cut-log-dispatcher.ts`. Each is a near-clone of `build-materialize-import-dispatcher.ts` — ~25 lines, swap topic + queue + job-name constants and parser.
- **Worker handlers shipped (3 new):** `processors/pending-save-cut-log-batch.ts`, `processors/finalize-cut-log-batch.ts`, `processors/void-cut-log.ts`. Each mirrors `materialize-import-batch.ts` — `CutLogExecutionError` wrapped to `UnrecoverableError`; transport errors propagate.
- **Handler tests shipped (3 new files, 9 new tests):** every handler has happy-path, domain-error wrapping, and transport-error propagation cases. **All 12 worker tests pass** (1 existing + 9 new).
- **Single relay edit** — appended 3 builders to `apps/relay/src/dispatch/dispatchers.ts`. Because `apps/relay/src/bootstrap.ts` and `apps/relay/src/bull-board.ts` both iterate `dispatchers.map(...)` automatically, the new queues get polled AND show up in Bull Board with no further wiring.
- **Worker env extended with 6 new vars:** `{PENDING_SAVE_CUT_LOG, FINALIZE_CUT_LOG, VOID_CUT_LOG}_WORKER_{CONCURRENCY, LOCK_DURATION_MS}`. Defaults match `MATERIALIZE_WORKER_*` (concurrency=1, lockDurationMs=60_000) so dev / staging is usable without env wiring.
- **Worker bootstrap extended** with 3 new `Worker<Payload>` + 3 new `QueueEvents` pairs, each with topic-appropriate `active` / `completed` / `failed` log handlers.
- **Sweep-5 typecheck regressions: 0.** All workspaces clean. Worker test suite passes. `guard:prisma` unchanged (only the unrelated staged-inv sibling violation persists).

## Pipeline now live (end-to-end, no UI)

With sweep 5 landed, a producer use case from sweep 4 can be invoked
directly (via REPL, smoke script, or test fixture) and the full
pipeline runs:

```
producer use case
  → createQueueOutboxEvent (status=PENDING)
  → relay polls + claims (PENDING → PROCESSING)
  → relay parses + adds BullMQ job (jobId = idempotencyKey)
  → relay marks DISPATCHED
  → BullMQ holds in Redis
  → worker pulls + parses payload + calls consumer use case
  → consumer use case applies + asserts + commits
  → BullMQ marks complete (or "failed" + UnrecoverableError on domain failure)
```

Sweep 6 (API routes) is now the only piece between the user clicking
a button in the UI and this pipeline running.

## Typecheck error counts

| Workspace | Errors | Notes |
|---|---|---|
| @builders/domain | 0 | clean |
| @builders/db | 0 | clean |
| @builders/application | 0 | clean (after rebuilding dist for sweep-4 exports) |
| @builders/lib | 0 | clean |
| @builders/relay | 0 | clean (the workspace this sweep changes) |
| @builders/worker | 0 | clean (the other workspace this sweep changes) |
| @builders/web | 0 sweep-5-attributable | 3 pre-existing TS7006 errors in `apps/web/modules/work-orders/...`, unchanged |

**Total sweep-5 regressions: 0.**

## Worker test results

```
Test Files  4 passed (4)
     Tests  12 passed (12)
```

- `materialize-import-batch.test.ts` (3 tests, pre-existing) — passing
- `pending-save-cut-log-batch.test.ts` (3 tests, new) — passing
- `finalize-cut-log-batch.test.ts` (3 tests, new) — passing
- `void-cut-log.test.ts` (3 tests, new) — passing

## Files changed

### Created (9 new files)

**Relay (3 dispatcher configs):**
- `apps/relay/src/dispatch/build-pending-save-cut-log-dispatcher.ts`
- `apps/relay/src/dispatch/build-finalize-cut-log-dispatcher.ts`
- `apps/relay/src/dispatch/build-void-cut-log-dispatcher.ts`

**Worker (3 handlers):**
- `apps/worker/src/processors/pending-save-cut-log-batch.ts`
- `apps/worker/src/processors/finalize-cut-log-batch.ts`
- `apps/worker/src/processors/void-cut-log.ts`

**Tests (3 handler tests):**
- `apps/worker/tests/pending-save-cut-log-batch.test.ts`
- `apps/worker/tests/finalize-cut-log-batch.test.ts`
- `apps/worker/tests/void-cut-log.test.ts`

### Modified

- `apps/relay/src/dispatch/dispatchers.ts` — appended 3 new builders to the registry array.
- `apps/worker/src/env.ts` — added 6 new env vars (concurrency + lockDuration per topic).
- `apps/worker/src/bootstrap.ts` — added 3 new `Worker<Payload>` + 3 new `QueueEvents`, with topic-appropriate logging blocks. Updated the `Promise.all([...waitUntilReady])` and the SIGINT/SIGTERM shutdown's `Promise.all([...close()])`.

### Verified unchanged

- `apps/relay/src/dispatch/topic-dispatcher.ts` — generic loop.
- `apps/relay/src/dispatch/bullmq-idempotent-dispatch.ts` — generic helper.
- `apps/relay/src/bootstrap.ts` — auto-iterates dispatchers.
- `apps/relay/src/bull-board.ts` — auto-iterates dispatchers (new queues surface in admin UI without code changes).
- `apps/relay/src/env.ts` — relay env is topic-agnostic.
- `apps/worker/src/queues/connection.ts` — Redis connection helper.
- `packages/db/src/queues/outbox-repository.ts` — generic state machine.
- `packages/domain/src/queue/{pending-save,finalize,void}-cut-log*.ts` — sweep-2 contracts (with the post-sweep-4 fix to add `id` to `CutLogDraftPayload`).

## Decisions baked in (matches plan exactly)

1. **Topic-per-action.** Three independent BullMQ queues, three independent Workers. No shared discriminator-based handler.
2. **Generic relay machinery reused unchanged.** Only `dispatchers.ts` got an edit; the loop and Bull Board iterate dispatchers automatically.
3. **`CutLogExecutionError` → `UnrecoverableError`** at every cut-log handler boundary, matching staged-inv's `StagedInventoryExecutionError` convention. Domain failures surface in Bull Board's failed set with no retry; transport errors retry per BullMQ's job options.
4. **Idempotency stays at the outbox layer.** `buildJobId: (_payload, event) => event.idempotencyKey` for all three new dispatchers. The outbox repo's unique-`idempotencyKey` constraint dedupes concurrent producer writes; BullMQ's jobId dedupe guards against re-dispatch.
5. **Defaults pinned at concurrency=1, lockDurationMs=60_000** — same as `MATERIALIZE_WORKER_*`. Per-topic env vars exist as escape hatches but no production tuning required at this stage.
6. **Worker logging discriminates per topic** — each pair of `active`/`completed`/`failed` handlers has a topic-appropriate `details` shape (`addedCount`/`modifiedCount`/`deletedCount` for pending-save; `cutLogCount` + `finalizedCount` for finalize; `cutLogId` for void). All routed through `logStructuredEvent` for consistent observability.

## Verification commands run

| Command | Result |
|---|---|
| `npm run build --workspace @builders/application` | clean (refreshed dist for sweep-4 cut-log exports) |
| `npm run typecheck --workspace @builders/relay` | clean |
| `npm run typecheck --workspace @builders/worker` | clean |
| `npm run typecheck --workspace @builders/{domain,db,application,lib}` | all clean |
| `npm run typecheck --workspace @builders/web` | 3 pre-existing failures (work-orders module), 0 sweep-5 regressions |
| `npm test --workspace @builders/worker` | 12/12 passing |
| `npm run guard:prisma` | unchanged — only the staged-inv sibling violation persists (out of scope) |
| `grep "buildPending\|buildFinalize\|buildVoid\|buildMaterialize" apps/relay/src/dispatch/dispatchers.ts` | 4 imports + 4 calls — every dispatcher registered |
| `grep "_QUEUE\\|new Worker" apps/worker/src/bootstrap.ts` | 4 Worker constructors + 4 QueueEvents — every queue wired |

## End-to-end smoke test (recommended before sweep 6)

The pipeline is now run-ready without any UI. Suggested verification
flow (no script files committed for this — invoke from a REPL or
ad-hoc test):

1. Start `apps/relay` and `apps/worker` locally pointing at the same
   Redis + Postgres.
2. Invoke any producer use case, e.g.:
   ```ts
   await markCutLogForVoidUseCase({
     inventoryId: someInventoryId,
     cutLogId: somePendingCutLogId,
     requestedBy: { userId, userEmail },
   })
   ```
3. Watch the structured logs:
   - `outbox.created` (status=PENDING)
   - `relay.dispatch.claimed` (PENDING → PROCESSING)
   - `relay.dispatch.enqueued` (DISPATCHED, BullMQ jobId set)
   - `worker.cut_logs.void.active`
   - `worker.cut_logs.void.completed`
4. Inspect `flooring_cut_log` — the row should be `status=VOID`,
   `void=true`, `cut="0"`, `coverageCut/cost/freight=null`.
5. Inspect `flooring_inventory.totalCutSum` — should reflect the
   void.
6. Bull Board at `localhost:<port>/<basePath>` shows the queues and
   the completed job.

Failure modes worth reproducing:
- Domain error → kill the inventory row mid-flight → `CutLogExecutionError` → `UnrecoverableError` → Bull Board "failed" set, zero retries.
- Transport error → kill Postgres → propagate → Bull Board retries with backoff.
- Duplicate outbox event (same `idempotencyKey`) → relay returns `wasDuplicate=true`, BullMQ's `jobId` collision suppresses the re-enqueue.

## Out of scope (next sweeps)

- **Sweep 6 (API routes):** `POST /api/inventory/[id]/cut-logs/...` for queue-pending-save, queue-finalize, queue-void; separate sync route for link edits. Routes call producer use cases (sweep 4) and translate `CutLogExecutionError.status` to HTTP responses.
- Sweep 7 (loaders), sweep 8 (UI + controllers).
- Fixing `staged-inventory-rows/types.ts` Prisma import (separate cleanup, unrelated).
- Adding the work-order-link DB CHECK constraint (deferred indefinitely).
