Let me first look at the actual relay + worker file layout so the comparison maps to real paths.

## Sweep 5 — relay + worker + outbox topic registration

The whole "outbox + relay + worker" chain is the bridge between a producer use case writing to a Postgres table and the consumer use case actually running. Sweep 5 wires that bridge for cut-logs by following the staged-inv template — the trick is we have to do it **three times**, one per topic. Here's the comparison.

---

## End-to-end pipeline (already shipped through sweep 4)

```
1. User clicks "Save" / "Finalize" / "Void"   ← UI (sweep 8)
2. POST /api/inventory/[id]/cut-logs/...      ← Route (sweep 6)
3. Producer use case (sweep 4)
   - validates via domain
   - flips row status (finalize / void only)
   - createQueueOutboxEvent(...)              ← writes to queue_outbox_event table
                                                 with status="PENDING"
4. ─────────────── boundary: tx commits ──────────────
5. RELAY app polls queue_outbox_event         ← THIS IS SWEEP 5
   - claims event (PENDING → PROCESSING)
   - parses payload via the topic's parser
   - addBullMqJobIdempotently(jobId = idempotencyKey)
   - marks event DISPATCHED
6. BullMQ holds the job in Redis
7. WORKER app picks the job off the queue    ← THIS IS SWEEP 5
   - calls the consumer use case from sweep 4
   - on success: BullMQ marks complete
   - on transient error: BullMQ retries with backoff
   - on UnrecoverableError: BullMQ moves to "failed" set
```

Steps 1–4 are done. Steps 5 and 7 are sweep 5. Step 6 (BullMQ + Redis) is infrastructure that's already running.

---

## What staged-inv ships today (the template)

Staged-inv has **one** worker job: import materialization. So it has one of everything in the relay/worker layers:

| File | Role |
| --- | --- |
| [apps/relay/src/dispatch/topic-dispatcher.ts](apps/relay/src/dispatch/topic-dispatcher.ts) | **Generic** — claim, parse, enqueue, mark dispatched, retry/exhaust. Topic-agnostic. Already shipped. |
| [apps/relay/src/dispatch/bullmq-idempotent-dispatch.ts](apps/relay/src/dispatch/bullmq-idempotent-dispatch.ts) | **Generic** — `addBullMqJobIdempotently` helper. Already shipped. |
| [apps/relay/src/dispatch/build-materialize-import-dispatcher.ts](apps/relay/src/dispatch/build-materialize-import-dispatcher.ts) | **Per-topic config**. Returns a `TopicDispatcher<ImportMaterializeBatchPayload>` with the topic constant, the BullMQ Queue handle, the parser, and the jobId builder (`event.idempotencyKey`). |
| [apps/relay/src/dispatch/dispatchers.ts](apps/relay/src/dispatch/dispatchers.ts) | **Topic registry** — single entry point for the relay's polling loop. Right now returns `[buildMaterializeImportDispatcher(connection)]`. |
| [apps/worker/src/processors/materialize-import-batch.ts](apps/worker/src/processors/materialize-import-batch.ts) | **Per-topic handler**. Parses the BullMQ job's `data`, calls `materializeImportedStagedRowsUseCase`, wraps `StagedInventoryExecutionError` in `UnrecoverableError` so domain failures don't retry. Other errors (Prisma blip, Redis hiccup) propagate so BullMQ retries them. |
| [apps/worker/src/bootstrap.ts](apps/worker/src/bootstrap.ts) | **Worker process entry**. Constructs one `Worker<Payload>(QUEUE_NAME, handler, {...})` + one `QueueEvents(QUEUE_NAME)`, attaches `active` / `completed` / `failed` log handlers, awaits `waitUntilReady`, sets up SIGINT/SIGTERM shutdown. |
| [apps/worker/tests/materialize-import-batch.test.ts](apps/worker/tests/materialize-import-batch.test.ts) | Tests the handler in isolation: happy path, domain-error wrapping, transport-error propagation. |

Everything `Generic` in that list stays untouched. Everything `Per-topic` gets a cut-log sibling.

---

## What sweep 5 ships for cut-logs

We have **three** topics, so we end up with three parallel sets of per-topic files. The contracts are already in `packages/domain/src/queue/` from sweep 2 — those exports (`PENDING_SAVE_CUT_LOG_TOPIC`, `FINALIZE_CUT_LOG_TOPIC`, `VOID_CUT_LOG_TOPIC` plus the matching `_QUEUE`, `_JOB_NAME`, schema, and parser per topic) are the inputs sweep 5 plugs into the templates.

### New files

**Relay side (3 dispatcher configs):**
- `apps/relay/src/dispatch/build-pending-save-cut-log-dispatcher.ts`
- `apps/relay/src/dispatch/build-finalize-cut-log-dispatcher.ts`
- `apps/relay/src/dispatch/build-void-cut-log-dispatcher.ts`

Each one is a **near-clone of** `build-materialize-import-dispatcher.ts`. The whole file is ~25 lines: import the topic constants + parser from `@builders/domain`, instantiate `new Queue<Payload>(QUEUE_NAME, { connection })`, return `{ topic, jobName, queue, parsePayload, buildJobId, close }`. Difference from staged-inv: the import is `parsePendingSaveCutLogBatchPayload` (or finalize / void), not `parseImportMaterializeBatchPayload`. Otherwise structurally identical.

**Worker side (3 handlers):**
- `apps/worker/src/processors/pending-save-cut-log-batch.ts`
- `apps/worker/src/processors/finalize-cut-log-batch.ts`
- `apps/worker/src/processors/void-cut-log.ts`

Each one mirrors `materialize-import-batch.ts`. The shape:
```ts
export function createPendingSaveCutLogBatchHandler(deps = defaultDeps) {
  return async function processJob(job: { data: unknown }) {
    const payload = deps.parsePayload(job.data)
    try {
      return await deps.applyCutLogPendingDiff(payload)
    } catch (error) {
      if (error instanceof CutLogExecutionError) {
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  }
}
```
Difference from staged-inv: imports `applyCutLogPendingDiffUseCase` (or `finalizeCutLogsUseCase` / `voidCutLogUseCase`) from `@builders/application`. Catches `CutLogExecutionError` instead of `StagedInventoryExecutionError`.

**Tests (3 handler tests):**
- `apps/worker/tests/pending-save-cut-log-batch.test.ts`
- `apps/worker/tests/finalize-cut-log-batch.test.ts`
- `apps/worker/tests/void-cut-log.test.ts`

Same three test cases each: happy path → returns the use case's result; `CutLogExecutionError` → wrapped as `UnrecoverableError`; transport error → propagates.

### Modified files

- **`apps/relay/src/dispatch/dispatchers.ts`** — append the 3 new builders to the registry:
  ```ts
  return [
    buildMaterializeImportDispatcher(connection),
    buildPendingSaveCutLogDispatcher(connection),
    buildFinalizeCutLogDispatcher(connection),
    buildVoidCutLogDispatcher(connection),
  ]
  ```
  That single edit is what makes the relay's polling loop pick up the three new topics.
- **`apps/worker/src/bootstrap.ts`** — for each of the 3 new queues, instantiate a `Worker<Payload>` + a `QueueEvents`, attach `active` / `completed` / `failed` log handlers, add to the `Promise.all([...waitUntilReady])` and to the shutdown handler. Right now there's one `materializeWorker`; we end up with four total (`materialize`, `pendingSaveCutLog`, `finalizeCutLog`, `voidCutLog`). Each needs its own concurrency + lock-duration env knobs.
- **`apps/worker/src/env.ts`** — add 3 new env vars per queue: `pendingSaveCutLogWorkerConcurrency`, `pendingSaveCutLogWorkerLockDurationMs`, plus the same pair for finalize and void. Sensible defaults.
- **`apps/relay/src/bull-board.ts`** — register the three new BullMQ queues so they show up in the admin dashboard. Pure ops convenience; not required for correctness.

### Reused unchanged

- `apps/relay/src/dispatch/topic-dispatcher.ts` — the generic claim/dispatch/retry loop already works for any `TopicDispatcher<T>`.
- `apps/relay/src/dispatch/bullmq-idempotent-dispatch.ts` — idempotent enqueue helper.
- `packages/db/src/queues/outbox-repository.ts` — the PENDING → PROCESSING → DISPATCHED | EXHAUSTED state machine is topic-agnostic.
- `apps/relay/src/bootstrap.ts` — the relay's main entry calls `buildDispatchers(connection)` and iterates whatever it gets back.

---

## Side-by-side comparison

| Concern | Staged-inv (today) | Cut-logs (sweep 5) |
|---|---|---|
| Topics | 1 (`flooring.imports.materialize`) | 3 (`pending-save`, `finalize`, `void`) |
| BullMQ queues | 1 | 3 |
| `build-X-dispatcher.ts` files | 1 | 3 |
| `processors/X.ts` files | 1 | 3 |
| Workers spawned in `bootstrap.ts` | 1 | 4 (existing + 3 new) |
| Test files | 1 | 3 |
| Generic dispatcher loop | shared | shared (no change) |
| Outbox repo | shared | shared (no change) |
| Idempotency | jobId = `event.idempotencyKey` | same — exactly the same `buildJobId: (_, event) => event.idempotencyKey` shape |
| Domain-error class wrapped to `UnrecoverableError` | `StagedInventoryExecutionError` | `CutLogExecutionError` |
| Producer-side outbox writer | `createQueueOutboxEvent` | `createQueueOutboxEvent` (same — generic) |

The only conceptual difference is **fan-out**. Staged-inv has one event flow because the import lifecycle is linear (DRAFT → QUEUED → IMPORTED). Cut-logs has three because the user can take three independent actions on a cut log (save edits, finalize, void), each with its own data primitive on the worker side. Topic-per-action keeps the queues independently retryable, observable, and rate-limitable; mashing them into one topic would force every payload to carry a discriminator and every handler to branch.

---

## What sweep 5 does NOT do

- **Doesn't change anything in `packages/`.** All the contracts (topic constants, payload schemas, parsers) are already in domain. All the data primitives + use cases are in db / application from sweeps 3 + 4. Sweep 5 is purely the relay/worker plumbing in `apps/`.
- **Doesn't add the API routes.** Sweep 6.
- **Doesn't hook up the UI.** Sweep 8.

