# Sweep 4c — Relay topic + worker handler plan

## Context

Sweep 4b wired the producer side of the import → inventory pipeline: `markStagedRowsForImportUseCase` writes a `flooring.imports.materialize` event to `queue_outbox_event` with a deterministic idempotency key. There is no consumer. The relay's dispatcher is hard-coded for a single (broken) work-order topic; the worker's handler imports symbols that no longer exist. Anything in `apps/relay/`, `apps/worker/`, and the outbox-consumer paths is prehistoric scaffolding from a prior architecture and is being **replaced**, not extended.

This sweep delivers the first real outbox relay + BullMQ worker. It establishes the precedent for every future topic.

**End state**: a route can call `markStagedRowsForImportUseCase`, the relay claims the resulting outbox event and enqueues a BullMQ job, the worker consumes the job and calls `materializeImportedStagedRowsUseCase`, inventory rows get created, and the staged rows flip QUEUED → IMPORTED. End to end.

This sweep does **not** add an apps/web route — that is sweep 5. The relay + worker must land before the route, otherwise outbox events accumulate as `EXHAUSTED`.

## Architecture

### Topic registry pattern

Multiple topics will exist over time. The relay shouldn't grow a `switch (event.topic)` — it should iterate a registry. Each topic ships a config:

```ts
type TopicDispatcher<TPayload> = {
  topic: string
  queueName: string
  jobName: string
  parsePayload: (raw: unknown) => TPayload
  buildQueue: (connection: ConnectionConfig) => Queue<TPayload>
}
```

The relay's bootstrap holds a `TopicDispatcher[]`. The polling loop iterates them per tick, calling a generic `dispatchBatchForTopic(env, dispatcher)`. Adding a future topic = appending one entry.

### Where the contract lives

- **Domain** owns the topic constant, the Zod payload schema, the queue name, and the job name for each topic. These are tied to the application contract — adding a new topic means adding domain artifacts first.
- **Relay** imports the dispatcher config from domain, instantiates the BullMQ `Queue`, polls outbox, enqueues, marks events `DISPATCHED`.
- **Worker** imports the queue name and payload parser from domain, instantiates a BullMQ `Worker`, calls the application use case, classifies errors.

### Error model (load-bearing)

- **`DISPATCHED`** in the outbox means "BullMQ accepted the job," not "the job ran." Worker retries are BullMQ-internal and don't touch the outbox.
- The relay marks an event `EXHAUSTED` only if **enqueue fails** more than `RELAY_MAX_ATTEMPTS` times (e.g. Redis unreachable). Enqueue rarely fails.
- The worker handler:
  - Throws `UnrecoverableError` (BullMQ's terminal-fail signal) when `materializeImportedStagedRowsUseCase` throws `StagedInventoryExecutionError`. The job goes to BullMQ's failed set; no retry.
  - Throws plain `Error` for transport/transient failures (Redis hiccup, Prisma connection blip). BullMQ retries per its policy.
- Dead-letter for terminal worker failures lives in BullMQ's failed-jobs queue (visible in Bull Board), not in the outbox.

### Idempotency at every layer

- **Producer** writes a deterministic `idempotencyKey` in `queue_outbox_event` (sweep 4b).
- **Relay** uses that same key as the BullMQ `jobId`. `addBullMqJobIdempotently` (existing helper) catches the dedup error and returns `wasDuplicate: true`.
- **Worker** is naturally idempotent because `materializeImportedStagedRowsUseCase` does a precondition check on `status: "QUEUED"`. A duplicate job hits zero `QUEUED` rows and dead-letters cleanly via `STAGED_MATERIALIZE_PRECONDITION_FAILED`.

## Per-file delta

### Domain (extend existing file)

| File | Change |
|---|---|
| `packages/domain/src/flooring/imports/staged-inventory-rows/import-batch-payload.ts` | Add `IMPORT_MATERIALIZE_QUEUE = "flooring-imports-materialize"` and `IMPORT_MATERIALIZE_JOB_NAME = "materialize-batch"` constants alongside `IMPORT_MATERIALIZE_TOPIC`. Keep the Zod schema and `parseImportMaterializeBatchPayload` as-is. |

Co-locating queue/job/topic/payload in one file is the new convention for this codebase — the existing `packages/domain/src/queue/auto-allocate-work-order.ts` is prehistoric and will not be the model.

### Relay (rip + replace)

| File | Change |
|---|---|
| `apps/relay/src/dispatch/work-order-allocation-outbox-dispatcher.ts` | **DELETE.** Prehistoric single-topic dispatcher. |
| `apps/relay/src/dispatch/bullmq-job-id.ts` | **DELETE.** Prehistoric. |
| `apps/relay/src/dispatch/bullmq-idempotent-dispatch.ts` | **KEEP.** Generic helper, survives. |
| `apps/relay/src/dispatch/topic-dispatcher.ts` | **NEW.** Generic per-topic batch loop: claim → parse → enqueue idempotently → mark dispatched. Handles retry/exhaust on enqueue failure. |
| `apps/relay/src/dispatch/dispatchers.ts` | **NEW.** Registry of `TopicDispatcher`s. Initially: `[buildMaterializeImportDispatcher(connection)]`. Add to this list to register a new topic. |
| `apps/relay/src/dispatch/build-materialize-import-dispatcher.ts` | **NEW.** Wires `IMPORT_MATERIALIZE_TOPIC` / `IMPORT_MATERIALIZE_QUEUE` / `IMPORT_MATERIALIZE_JOB_NAME` / `parseImportMaterializeBatchPayload` from domain into a `TopicDispatcher` value. |
| `apps/relay/src/bootstrap.ts` | Replace the single `autoAllocationQueue` + `dispatchBatch` call with a list of dispatchers, loop iterates `Promise.allSettled(dispatchers.map(d => dispatchBatchForTopic(env, d)))`. Remove `autoAllocationQueue` references. |
| `apps/relay/src/bull-board.ts` | Register the new `flooring-imports-materialize` queue with the board. Drop the work-order queue registration. |
| `apps/relay/tests/work-order-allocation-outbox-dispatcher.test.ts` | **DELETE.** Replace with `apps/relay/tests/topic-dispatcher.test.ts` covering the generic dispatcher (claim succeeds → enqueue → mark dispatched; enqueue fails → retry; exceeds max attempts → exhaust; duplicate enqueue → mark dispatched anyway). |

### Worker (rip + replace)

| File | Change |
|---|---|
| `apps/worker/src/application/process-work-order-auto-allocation.ts` | **DELETE.** |
| `apps/worker/src/processors/process-work-order-auto-allocation.ts` | **DELETE.** |
| `apps/worker/src/queues/connection.ts` | **KEEP.** Reusable. |
| `apps/worker/src/processors/materialize-import-batch.ts` | **NEW.** Handler body: parse `job.data` with `parseImportMaterializeBatchPayload`, call `materializeImportedStagedRowsUseCase(payload)`, catch `StagedInventoryExecutionError` → throw `UnrecoverableError(error.message)`, let other errors propagate as retryable. Returns the use case's result for the BullMQ completed-event log. |
| `apps/worker/src/bootstrap.ts` | Replace the `autoAllocationWorker` + `autoAllocationEvents` block with a `materializeImportWorker` + matching `QueueEvents` for `IMPORT_MATERIALIZE_QUEUE`. Drop work-order references. Lifecycle log fields adjusted (replace `workOrderId`/`generationId` with `importEntryId`/`stagedRowCount`). |
| `apps/worker/src/env.ts` | Replace `AUTO_ALLOCATION_WORKER_*` env vars with `MATERIALIZE_WORKER_CONCURRENCY` (default 1) and `MATERIALIZE_WORKER_LOCK_DURATION_MS` (default 60000 — materialize is short, 5min was overkill). |
| `apps/worker/tests/process-work-order-auto-allocation.test.ts` | **DELETE.** Replace with `apps/worker/tests/materialize-import-batch.test.ts` covering: happy path → `materializeStagedRowsToInventory` called with mapped payload; `STAGED_MATERIALIZE_PRECONDITION_FAILED` → throws `UnrecoverableError`; transport error → re-throws plain. |

### `.env.example`

Add the two new worker env vars under the queue section. `QUEUE_REDIS_URL` / `REDIS_URL` are already documented.

## What this does NOT do

- No apps/web route changes (sweep 5).
- No domain or application changes beyond the three new constants in the existing payload file.
- No work-order auto-allocation rebuild. **The work-order code is being deleted entirely.** When work-order auto-allocation is rebuilt later, it adopts the new topic registry pattern (one `buildAutoAllocateWorkOrderDispatcher` + one Worker registration). Cleaner than carrying a stub.
- No outbox-repository changes. The data-layer surface (`listClaimableQueueOutboxEvents`, `claimQueueOutboxEvent`, `markQueueOutboxEventDispatched`, `retryQueueOutboxEvent`, `exhaustQueueOutboxEvent`) is already correct.
- No new Prisma migrations. Schema is unchanged.

## Verification

1. **Build clean**: `npm run build --workspace=apps/relay` and `--workspace=apps/worker` both succeed without ignoring errors.
2. **Type clean**: `npx tsc -b` from repo root has zero errors in `apps/relay/`, `apps/worker/`, and the touched domain file.
3. **Unit tests**: new vitest files green. Cover the dispatch happy/retry/exhaust paths and the worker happy/unrecoverable/retryable paths.
4. **End-to-end smoke** (manual, requires Redis + Postgres):
   - Start relay + worker in dev (`npm run dev -w apps/relay`, `npm run dev -w apps/worker`).
   - From a tsx script or psql, insert a fake import + 2 staged rows in `DRAFT`, then call `markStagedRowsForImportUseCase` directly (no route yet).
   - Watch logs: relay claims event, enqueues job, marks DISPATCHED. Worker picks up job, calls use case, logs completion. Inventory rows appear, staged rows flip to `IMPORTED`.
   - Run again with the same staged rows: producer returns `wasDuplicate: true`; relay/worker no-op cleanly.
   - Run with one staged row deleted between mark and worker pickup: worker's precondition check fails, job dead-letters in BullMQ failed set, outbox stays `DISPATCHED`.
5. **Bull Board** at `http://localhost:<BULL_BOARD_PORT>/<BULL_BOARD_BASE_PATH>` shows the new queue and the test jobs.

## Sequencing

This sweep stands alone. It does not require any change in `apps/web/`. After it lands:

- Sweep 5 can ship the apps/web routes that call `saveStagedInventoryRowsUseCase` and `markStagedRowsForImportUseCase`.
- A user clicking "send to import" in the UI will produce an outbox event, the relay enqueues, the worker materializes, and the UI can poll for completion.

## Decisions

1. **Work-order auto-allocation deleted entirely.** Locked. Files: `apps/relay/src/dispatch/work-order-allocation-outbox-dispatcher.ts`, `apps/relay/src/dispatch/bullmq-job-id.ts`, `apps/relay/tests/work-order-allocation-outbox-dispatcher.test.ts`, `apps/worker/src/application/process-work-order-auto-allocation.ts`, `apps/worker/src/processors/process-work-order-auto-allocation.ts`, `apps/worker/tests/process-work-order-auto-allocation.test.ts`. The auto-allocate domain queue artifact at `packages/domain/src/queue/auto-allocate-work-order.ts` is also no longer referenced by anything in the relay/worker after this sweep — flag for cleanup but does not block 4c.

## Open decisions (pending user confirmation)

2. **Domain artifact placement**: recommend moving all materialize-batch contract artifacts (topic, payload schema, parser, queue name, job name) into a new file `packages/domain/src/queue/materialize-import-batch.ts`. Reason: the contract is consumed by three layers (use case, relay, worker) and is a transport concern, not a feature concern. The `queue/` directory becomes a natural registry as more topics get added. Cost: 1-line import path change in `mark-staged-rows-for-import.ts`. The existing `queue/auto-allocate-work-order.ts` is being deleted with #1, so the directory is effectively starting fresh.

3. **Concurrency=1, lock duration=60s.** Concurrency=1 means the worker processes one materialize at a time. End-to-end pickup latency is dominated by `RELAY_POLL_INTERVAL_MS` (default 2s); the worker itself picks up sub-second from Redis pubsub. Lock duration is the "is this worker still alive?" timeout — 60s is generous safety headroom for sub-second materialize. Both can be tuned via env vars; defaults are conservative.

4. **Test depth: unit tests + manual smoke this sweep.** Unit tests cover dispatcher state transitions and worker error classification with mocks; manual smoke verifies real Redis/BullMQ/Postgres wiring during dev. Integration tests against testcontainers (or similar) deferred to a dedicated test-infrastructure sweep — that's a separate decision about testing pattern, not specifically a materialize concern.
