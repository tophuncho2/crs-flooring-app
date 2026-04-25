# Sweep 4c — Relay + worker rewrite, Railway deploy unblock — Report

## Summary

Replaced the prehistoric work-order outbox relay and BullMQ worker with the first real implementation of the topic registry pattern. Wired the producer-side `flooring.imports.materialize` event (sweep 4b) to a working consumer end-to-end. Added per-service Railway configs so each service builds and deploys independently — the apps/web build failure no longer cascades into relay or worker deploys.

`build:relay` and `build:worker` succeed clean. Relay test suite: 6/6 green. Worker test suite: 3/3 green. `tsc -b` from repo root has zero errors outside `apps/web/` (which is sweep 5's scope).

## Per-file delta

### Domain

| File | Change |
|---|---|
| `packages/domain/src/queue/materialize-import-batch.ts` | **NEW.** Owns the full `flooring.imports.materialize` contract: `IMPORT_MATERIALIZE_TOPIC`, `IMPORT_MATERIALIZE_QUEUE = "flooring-imports-materialize"`, `IMPORT_MATERIALIZE_JOB_NAME = "materialize-batch"`, `ImportMaterializeBatchPayloadSchema`, `ImportMaterializeBatchPayload` type, `parseImportMaterializeBatchPayload`. |
| `packages/domain/src/flooring/imports/staged-inventory-rows/import-batch-payload.ts` | **DELETED.** Contents moved to `queue/materialize-import-batch.ts`. |
| `packages/domain/src/flooring/imports/staged-inventory-rows/index.ts` | Removed the deleted file's barrel re-export. |
| `packages/domain/src/queue/auto-allocate-work-order.ts` | **DELETED.** Prehistoric, no remaining consumers. |
| `packages/domain/src/index.ts` | Drop `auto-allocate-work-order.js` re-export, add `materialize-import-batch.js` re-export. |

`mark-staged-rows-for-import.ts` and `materialize-imported-rows.ts` (application layer) consume the moved symbols via the `@builders/domain` barrel — no source changes needed there.

### Relay

| File | Change |
|---|---|
| `apps/relay/src/dispatch/work-order-allocation-outbox-dispatcher.ts` | **DELETED.** |
| `apps/relay/src/dispatch/bullmq-job-id.ts` | **DELETED.** |
| `apps/relay/tests/work-order-allocation-outbox-dispatcher.test.ts` | **DELETED.** |
| `apps/relay/src/dispatch/bullmq-idempotent-dispatch.ts` | Loosened `QueueLike` to use a structural `JobLike = { id?: string }` so it accepts both BullMQ's actual `Queue<T>` (whose `getJob` returns `Promise<JobBase<...>>`) and test mocks. Drops the `TName` generic — job names are always plain strings. |
| `apps/relay/src/dispatch/topic-dispatcher.ts` | **NEW.** Generic `dispatchBatchForTopic<TPayload>(env, dispatcher, deps?)`. Claim → `parsePayload` → `addBullMqJobIdempotently` → `markEventDispatched`. Payload-parse failures exhaust immediately (poison message). Enqueue failures retry with exponential backoff (30s base, 15min cap) until `env.maxAttempts`, then exhaust. Includes `TopicDispatcher<TPayload>` and `TopicDispatcherDependencies` types. |
| `apps/relay/src/dispatch/dispatchers.ts` | **NEW.** `buildDispatchers(connection)` returns `AnyTopicDispatcher[]` (= `TopicDispatcher<any>[]`). Initial registry: `[buildMaterializeImportDispatcher(connection)]`. |
| `apps/relay/src/dispatch/build-materialize-import-dispatcher.ts` | **NEW.** Wires the domain queue artifact into a `TopicDispatcher<ImportMaterializeBatchPayload>`. `buildJobId = (_, event) => event.idempotencyKey` — uses the producer's deterministic key directly as the BullMQ jobId. |
| `apps/relay/src/bootstrap.ts` | Replaced single-queue + single-dispatch loop with `Promise.allSettled(dispatchers.map(d => dispatchBatchForTopic(env, d)))` per tick. Per-dispatcher rejection logged with topic context. Shutdown closes all dispatchers. |
| `apps/relay/src/bull-board.ts` | Now accepts `dispatchers: AnyTopicDispatcher[]` instead of a single typed queue. Renders one `BullMQAdapter` per dispatcher. Logs include the queue name list. |
| `apps/relay/tests/topic-dispatcher.test.ts` | **NEW.** 6 unit tests covering: happy path, duplicate-jobId path (`wasDuplicate: true`), retry-with-attempts-remaining, exhaust-when-attempts-exceeded, poison-message exhaust on parse failure, raced-claim skip. |

### Worker

| File | Change |
|---|---|
| `apps/worker/src/application/process-work-order-auto-allocation.ts` | **DELETED.** (Empty `application/` directory removed.) |
| `apps/worker/src/processors/process-work-order-auto-allocation.ts` | **DELETED.** |
| `apps/worker/tests/process-work-order-auto-allocation.test.ts` | **DELETED.** |
| `apps/worker/src/render/` | Empty prehistoric directory — removed. |
| `apps/worker/src/queues/connection.ts` | **KEEP.** Reusable. |
| `apps/worker/src/processors/materialize-import-batch.ts` | **NEW.** `createMaterializeImportBatchHandler(deps?)` returns a job processor. Parses payload via `parseImportMaterializeBatchPayload` → calls `materializeImportedStagedRowsUseCase` → catches `StagedInventoryExecutionError` and re-throws as `UnrecoverableError` (BullMQ terminal-fail). All other errors propagate (BullMQ retries). Dependencies are constructor-injected for testability. |
| `apps/worker/src/bootstrap.ts` | Replaces `autoAllocationWorker` + `autoAllocationEvents` with `materializeWorker` + `materializeEvents` for `IMPORT_MATERIALIZE_QUEUE`. Lifecycle log fields use `importEntryId`, `stagedRowCount`, and the BullMQ jobId (= idempotency key). |
| `apps/worker/src/env.ts` | Renamed env vars: `AUTO_ALLOCATION_WORKER_CONCURRENCY` → `MATERIALIZE_WORKER_CONCURRENCY` (default 1), `AUTO_ALLOCATION_WORKER_LOCK_DURATION_MS` → `MATERIALIZE_WORKER_LOCK_DURATION_MS` (default 60_000). |
| `apps/worker/tests/materialize-import-batch.test.ts` | **NEW.** 3 unit tests: happy path, `StagedInventoryExecutionError` → `UnrecoverableError`, transport error propagates. |

### Railway deploy unblock

| File | Change |
|---|---|
| `apps/relay/railway.toml` | **NEW.** `buildCommand = "npm run build:relay"`, `startCommand = "npm run start:relay"`, healthcheck on `/healthz`, restart-on-failure max 10. |
| `apps/worker/railway.toml` | **NEW.** `buildCommand = "npm run build:worker"`, `startCommand = "npm run start:worker"`, no healthcheck (no HTTP server), restart-on-failure max 10. |
| `apps/web/railway.toml` | **NEW** (stub for sweep 5). `buildCommand = "npm run build:web"`. Comment documents that the web build will continue to fail until sweep 5 — purpose of this file is purely cascade isolation. |
| `tsconfig.json` (root) | Added `{ "path": "./apps/relay" }` to `references[]` (was absent). |
| `.env.example` | Documents `MATERIALIZE_WORKER_CONCURRENCY` and `MATERIALIZE_WORKER_LOCK_DURATION_MS`. |

## Architecture established

### Topic registry

The relay holds a `TopicDispatcher[]` and iterates it per polling tick. Each topic ships a config (topic, queue name, job name, payload parser, queue instance, jobId builder, close fn). Adding a new topic = appending one entry to `buildDispatchers(connection)`. No `switch (event.topic)` branch.

### Layer ownership

- **Domain** owns the contract artifact under `packages/domain/src/queue/<topic>.ts`. Producer (use case), relay, and worker all import from `@builders/domain`.
- **Relay** owns the BullMQ `Queue` instance and the dispatch state machine.
- **Worker** owns the BullMQ `Worker` instance and error classification. Calls the application use case directly.

### Error model

- Outbox `DISPATCHED` = "BullMQ accepted the job," not "the job ran." Worker retries are BullMQ-internal.
- Relay marks `EXHAUSTED` only after `RELAY_MAX_ATTEMPTS` (default 5) enqueue failures.
- Payload-parse failures exhaust immediately — retrying a malformed payload won't help.
- Worker classifies `StagedInventoryExecutionError` (domain-side terminal failure) as `UnrecoverableError`. Anything else propagates and BullMQ retries per its job options.

### Idempotency at every layer

- Producer (sweep 4b) writes deterministic `idempotencyKey = "import-materialize:${importEntryId}:${sortedRowIds.join(",")}"`.
- Relay uses that key as BullMQ `jobId`. Existing `addBullMqJobIdempotently` handles BullMQ's dedup error and returns `wasDuplicate: true`.
- Worker's `materializeImportedStagedRowsUseCase` precondition-checks `status: "QUEUED"` — duplicate jobs find zero rows and dead-letter via `STAGED_MATERIALIZE_PRECONDITION_FAILED`.

## Verification results

```
$ npm run build:relay
[clean exit]

$ npm run build:worker
[clean exit]

$ npm run build:web
[fails, as expected — apps/web fallout from sweep 4a is sweep 5's scope]

$ npx tsc -b
[167 errors total, ALL inside apps/web/. Zero errors in apps/relay,
 apps/worker, packages/domain, packages/db, packages/application,
 packages/lib.]

$ npm run test --workspace=apps/relay
Test Files  1 passed (1)
     Tests  6 passed (6)

$ npm run test --workspace=apps/worker
Test Files  1 passed (1)
     Tests  3 passed (3)
```

## Cascade isolation confirmed

The root `npm run build` script still chains every workspace and will fail because of the apps/web errors. But each Railway service's `railway.toml` now uses the per-service build script (`build:relay` / `build:worker` / `build:web`), which only chains that service's package dependencies. Apps/web's broken state cannot prevent relay or worker from deploying.

## Staging deploy procedure

Code-side, the sweep is complete. Railway-side steps the user needs to take in the dashboard:

1. For each Railway service (relay, "bull mq" / worker, web), set **Settings → Config-as-Code Path** to `apps/<service>/railway.toml`.
2. Optional: set `MATERIALIZE_WORKER_CONCURRENCY` and `MATERIALIZE_WORKER_LOCK_DURATION_MS` env vars on the worker service if non-default values desired (defaults: 1, 60000).
3. Trigger redeploy on relay and "bull mq" services. Both should build clean and reach the "ready" log line.
4. Web stays in failure state until sweep 5; that's expected.

After both relay and worker are running, execute the staging smoke procedure documented in [docs/sweep-4c-relay-worker-plan.md](docs/sweep-4c-relay-worker-plan.md) — call `markStagedRowsForImportUseCase` with a small fake batch, watch the outbox row flip `PENDING → DISPATCHED` within ~2s, watch Bull Board for the job, watch the worker's `worker.imports.materialize.completed` log line, verify inventory rows materialize and staged rows flip `QUEUED → IMPORTED`.

## Sweep 5 unblock

With this sweep landed, sweep 5 can ship the apps/web rewires (deleted-symbol cleanup, new routes for `saveStagedInventoryRowsUseCase` and `markStagedRowsForImportUseCase`, the diff-save UI). The relay and worker are ready to consume any outbox events those routes produce.

## Sequencing constraint resolved

Per the sweep-4b report, "sweep 4c must land before any sweep 5 route calls `markStagedRowsForImportUseCase`, otherwise the relay would EXHAUST events with 'Unsupported outbox topic.'" That blocker is now lifted — the relay knows the topic, the worker has a handler, and idempotency holds end-to-end.
