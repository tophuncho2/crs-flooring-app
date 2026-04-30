# Sweep 4c — Relay + worker rewrite, Railway deploy unblock

## Context

Sweep 4b landed the producer side of the import → inventory pipeline: `markStagedRowsForImportUseCase` writes a `flooring.imports.materialize` outbox event. There is no consumer. The relay's dispatcher is hard-coded for a single (broken) work-order topic; the worker's handler imports symbols that no longer exist (sweep 4a deleted them).

Three Railway services currently fail to redeploy:
- **app** (`apps/web`) — build fails on `apps/web/app/api/inventory/route.ts:2` (`createInventoryUseCase` deleted in 4a).
- **bull mq** (`apps/worker`) — build fails on `apps/worker/src/application/process-work-order-auto-allocation.ts:1` (work-order symbols don't exist).
- **relay** (`apps/relay`) — builds clean, but the **root** `npm run build` chains every workspace (`package.json:13`), so the worker/web failures cascade to the relay deploy too.

There is no `railway.toml` / `railway.json` / `nixpacks.toml` anywhere in the repo. Railway is auto-detecting the build command — and that command is the root build, which is the single point of failure.

This sweep delivers (1) the first real outbox relay + BullMQ worker, and (2) per-service Railway build configs so each service deploys independently. End state: relay and worker deploy clean to staging. Web stays broken (its rebuild is sweep 5).

## Scope

**IN:**
- Domain queue artifact (new file in `packages/domain/src/queue/`).
- Relay rewrite (topic registry pattern).
- Worker rewrite (BullMQ Worker for the new queue).
- Per-service Railway config so each service builds with `npm run build:<service>` instead of root build.
- Add `apps/relay` to root `tsconfig.json` project references (currently absent).
- Delete the prehistoric work-order code paths entirely.

**OUT:**
- `apps/web/` rewires (sweep 5).
- Cut-log paths.
- Any new outbox topics beyond materialize.
- BullMQ/Redis infra changes (Railway-managed services stay as-is).

After this sweep, **apps/web continues to fail to build** until sweep 5 lands. That's a known, bounded gap — the per-service Railway configs let relay and worker deploy independently while web stays in the broken state.

## Architecture

### Topic registry pattern

The relay holds a `TopicDispatcher[]` and iterates it per polling tick. Each topic ships a config:

```ts
type TopicDispatcher<TPayload> = {
  topic: string
  queueName: string
  jobName: string
  parsePayload: (raw: unknown) => TPayload
  buildQueue: (connection: ConnectionConfig) => Queue<TPayload>
}
```

Adding a future topic = appending one entry. No `switch (event.topic)` branch.

### Layer ownership

- **Domain** owns the topic constant, Zod payload schema, queue name, job name, and parser per topic — co-located in one file under `packages/domain/src/queue/`.
- **Relay** imports the dispatcher config from domain, instantiates the BullMQ `Queue`, polls outbox, enqueues idempotently, marks events `DISPATCHED`.
- **Worker** imports queue name + parser from domain, instantiates a BullMQ `Worker`, calls the application use case, classifies errors.

### Error model

- `DISPATCHED` in the outbox = "BullMQ accepted the job," not "the job ran." Worker retries are BullMQ-internal.
- Relay marks `EXHAUSTED` only if **enqueue** fails more than `RELAY_MAX_ATTEMPTS` times (e.g. Redis unreachable).
- Worker handler:
  - `StagedInventoryExecutionError` → throw `UnrecoverableError` (BullMQ terminal-fail signal). Job goes to BullMQ failed set; visible in Bull Board.
  - Plain `Error` (transport/Prisma blip) → propagate. BullMQ retries per its policy.
- Dead-letter for terminal worker failures = BullMQ failed-jobs queue, not the outbox.

### Idempotency at every layer

- Producer writes deterministic `idempotencyKey` (sweep 4b).
- Relay uses that key as BullMQ `jobId`. Existing `addBullMqJobIdempotently` returns `{ job, wasDuplicate }`.
- Worker is naturally idempotent because `materializeImportedStagedRowsUseCase` precondition-checks `status: "QUEUED"`. Duplicate jobs hit zero rows and dead-letter cleanly via `STAGED_MATERIALIZE_PRECONDITION_FAILED`.

## Per-file delta

### Domain

| File | Change |
|---|---|
| `packages/domain/src/queue/materialize-import-batch.ts` | **NEW.** Holds `IMPORT_MATERIALIZE_TOPIC`, `IMPORT_MATERIALIZE_QUEUE = "flooring-imports-materialize"`, `IMPORT_MATERIALIZE_JOB_NAME = "materialize-batch"`, `ImportMaterializeBatchPayloadSchema`, `ImportMaterializeBatchPayload` type, `parseImportMaterializeBatchPayload`. Moved from the import-batch-payload location. |
| `packages/domain/src/flooring/imports/staged-inventory-rows/import-batch-payload.ts` | **DELETE** — contents moved to `queue/materialize-import-batch.ts`. |
| `packages/domain/src/flooring/imports/staged-inventory-rows/index.ts` | Remove the deleted file from barrel exports. |
| `packages/domain/src/queue/auto-allocate-work-order.ts` | **DELETE.** Prehistoric, no consumers after this sweep. |
| `packages/domain/src/queue/index.ts` | Update barrel — drop work-order, add materialize-import-batch. |
| `packages/application/src/flooring/imports/staged-inventory-rows/mark-staged-rows-for-import.ts` | Update import path to `@builders/domain` (single line — re-exports from `queue/`). |

### Relay

| File | Change |
|---|---|
| `apps/relay/src/dispatch/work-order-allocation-outbox-dispatcher.ts` | **DELETE.** |
| `apps/relay/src/dispatch/bullmq-job-id.ts` | **DELETE.** |
| `apps/relay/tests/work-order-allocation-outbox-dispatcher.test.ts` | **DELETE.** |
| `apps/relay/src/dispatch/bullmq-idempotent-dispatch.ts` | **KEEP.** Generic helper. |
| `apps/relay/src/dispatch/topic-dispatcher.ts` | **NEW.** Generic per-topic loop: `listClaimableQueueOutboxEvents({ topic, limit })` → `claimQueueOutboxEvent` → `parsePayload` → `addBullMqJobIdempotently` → `markQueueOutboxEventDispatched`. On parse/enqueue failure: `retryQueueOutboxEvent` until `attemptCount >= RELAY_MAX_ATTEMPTS`, then `exhaustQueueOutboxEvent`. |
| `apps/relay/src/dispatch/dispatchers.ts` | **NEW.** `buildDispatchers(connection: ConnectionConfig)` returns `TopicDispatcher[]`. Initial: `[buildMaterializeImportDispatcher(connection)]`. |
| `apps/relay/src/dispatch/build-materialize-import-dispatcher.ts` | **NEW.** Wires the domain queue artifact into a `TopicDispatcher` value. |
| `apps/relay/src/bootstrap.ts` | Replace single-queue + single-dispatch loop with `dispatchers = buildDispatchers(connection)` + `Promise.allSettled(dispatchers.map(d => dispatchBatchForTopic(env, d)))` per tick. Drop work-order references. |
| `apps/relay/src/bull-board.ts` | Register new `flooring-imports-materialize` queue. Drop work-order queue. |
| `apps/relay/tests/topic-dispatcher.test.ts` | **NEW.** Unit tests with mocked outbox repository + queue. Cover: claim succeeds → enqueue → mark dispatched; enqueue fails → retry; exceeds max attempts → exhaust; duplicate enqueue → mark dispatched anyway; parse failure → exhaust immediately (poison message). |

### Worker

| File | Change |
|---|---|
| `apps/worker/src/application/process-work-order-auto-allocation.ts` | **DELETE.** |
| `apps/worker/src/processors/process-work-order-auto-allocation.ts` | **DELETE.** |
| `apps/worker/tests/process-work-order-auto-allocation.test.ts` | **DELETE.** |
| `apps/worker/src/queues/connection.ts` | **KEEP.** |
| `apps/worker/src/processors/materialize-import-batch.ts` | **NEW.** Handler body: parse `job.data` via `parseImportMaterializeBatchPayload` → call `materializeImportedStagedRowsUseCase(payload)` → catch `StagedInventoryExecutionError` and throw `UnrecoverableError(error.message)` → let other errors propagate. Returns the use case result for completion logging. |
| `apps/worker/src/bootstrap.ts` | Replace `autoAllocationWorker` + `autoAllocationEvents` with `materializeImportWorker` + matching `QueueEvents` for `IMPORT_MATERIALIZE_QUEUE`. Update lifecycle log fields (`importEntryId`, `stagedRowCount` instead of `workOrderId`, `generationId`). |
| `apps/worker/src/env.ts` | Replace `AUTO_ALLOCATION_WORKER_CONCURRENCY` (default 1) and `AUTO_ALLOCATION_WORKER_LOCK_DURATION_MS` (default 300000) with `MATERIALIZE_WORKER_CONCURRENCY` (default 1) and `MATERIALIZE_WORKER_LOCK_DURATION_MS` (default 60000). |
| `apps/worker/tests/materialize-import-batch.test.ts` | **NEW.** Cover: happy path → `materializeStagedRowsToInventory` called with mapped payload; `STAGED_MATERIALIZE_PRECONDITION_FAILED` → throws `UnrecoverableError`; transport error → re-throws plain. |

### Railway deploy unblock

| File | Change |
|---|---|
| `apps/relay/railway.toml` | **NEW.** `[build] buildCommand = "npm run build:relay"` and `[deploy] startCommand = "npm run start --workspace @builders/relay"`. Healthcheck on `/healthz`. |
| `apps/worker/railway.toml` | **NEW.** `[build] buildCommand = "npm run build:worker"` and `[deploy] startCommand = "npm run start --workspace @builders/worker"`. No healthcheck (worker has no HTTP server). |
| `apps/web/railway.toml` | **NEW** *(stub for sweep 5 to refine)*. `[build] buildCommand = "npm run build:web"` and `[deploy] startCommand = "npm run start --workspace @builders/web"`. The web service will continue to fail to build until sweep 5 — the config just isolates the failure so it doesn't cascade into relay/worker deploys. |
| `tsconfig.json` (root) | Add `{ "path": "./apps/relay" }` to `references[]`. Currently absent — relay is not in the project graph, so cross-package type drift can leak in. |
| `.env.example` | Add `MATERIALIZE_WORKER_CONCURRENCY` and `MATERIALIZE_WORKER_LOCK_DURATION_MS` entries. |

## Locked decisions

1. Work-order auto-allocation deleted entirely (code, tests, domain queue artifact).
2. Domain artifact placement: new file at `packages/domain/src/queue/materialize-import-batch.ts` holding the full contract (topic, queue, job name, payload schema, parser).
3. Worker concurrency=1, lock duration=60s. Tunable via env.
4. Test depth: vitest unit tests + manual staging smoke. No testcontainers / integration test infrastructure this sweep.
5. apps/web stays OUT of sweep 4c. Per-service Railway configs isolate the failure so relay/worker deploys aren't blocked. Sweep 5 unbreaks web.
6. Railway service configs use `railway.toml` format.

## Verification

1. **Build clean per service**:
   - `npm run build:relay` succeeds.
   - `npm run build:worker` succeeds.
   - `npm run build:web` continues to fail (sweep 5) — confirm failure is isolated to web build, not bleeding into relay/worker.
2. **Type clean**: `npx tsc -b` from repo root shows zero errors in `apps/relay/`, `apps/worker/`, and the touched domain files.
3. **Unit tests green**: `npm run test --workspace @builders/relay` and `--workspace @builders/worker` pass.
4. **Staging smoke**: deploy + Bull Board validation. Procedure documented at the bottom.
5. **Cascade isolation**: trigger a deliberate apps/web build failure on a branch; confirm relay + worker still deploy cleanly via their per-service Railway configs.

## Staging smoke procedure

After deploy:

1. Deploy relay + worker to staging via Railway CLI.
2. Verify both services boot cleanly (Railway logs show "ready" + no crash loop).
3. From a one-off tsx script (or the eventual sweep-5 route), call `markStagedRowsForImportUseCase` with a small fake batch (2–3 rows). Confirm:
   - Outbox row appears in `queue_outbox_event` with status `PENDING`, then `DISPATCHED` within ~2s.
   - Bull Board shows the job arriving in `flooring-imports-materialize` queue.
   - Worker picks it up; structured log `event: "job.completed"` appears in worker logs.
   - Inventory rows exist with the expected snapshot fields.
   - Staged rows flipped `QUEUED → IMPORTED`.
4. Re-run with the same input. Confirm `wasDuplicate: true` flows through; no duplicate inventory rows.
5. Manually delete one staged row between mark-for-import and worker pickup. Confirm worker dead-letters via `STAGED_MATERIALIZE_PRECONDITION_FAILED`; outbox stays `DISPATCHED`; BullMQ failed set has the job.

## Sequencing

1. **Pre-execution**: observe staging Railway env (read-only — `railway logs`, `railway status`) to confirm current crash signatures.
2. **Code changes**: domain → relay → worker, in that order.
3. **Railway configs**: land last, since they're the deploy unblock.
4. **Sweep 5 unblocks afterwards**: apps/web rewires can ship without being gated on this work.
