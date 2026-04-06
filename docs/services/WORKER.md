# Worker Service

> **Scope:** BullMQ job processor. Receives jobs from the relay and delegates to application use cases.
> **Location:** `apps/worker/`
> **Status:** Active

## Rules

1. The worker is a thin processor — it delegates all business logic to `packages/application/` use cases.
2. Job schemas are typed and defined in `packages/domain/` — the worker validates jobs against these schemas.
3. Error classification determines retry behavior: `isWorkflowProcessingError` + `!retryable` -> `UnrecoverableError`.
4. Structured logging includes `jobId`, `correlationId`, and `attempt` on every log event.
5. Jobs are only enqueued via the outbox/relay pipeline — never directly from API routes.

## Configuration

| Setting | Default | Purpose |
|---------|---------|---------|
| Concurrency | 1 | Max concurrent job processors |
| Max attempts | 5 | Retries before permanent failure |
| Backoff base | 30 seconds | Exponential backoff starting point |
| Backoff type | Exponential | 30s, 60s, 120s, 240s, 480s |

## Contract

### Job Processing Flow

```
BullMQ delivers job
  │
  ├─ 1. Parse and validate job payload against domain schema
  │
  ├─ 2. Log structured start event (jobId, correlationId, attempt)
  │
  ├─ 3. Delegate to packages/application/ use case
  │
  ├─ 4a. Success:
  │      → Log structured success event
  │      → Job marked complete
  │
  └─ 4b. Failure:
         → Classify error:
           ├─ isWorkflowProcessingError && !retryable
           │    → throw UnrecoverableError (no more retries)
           └─ Otherwise
                → throw error (BullMQ retries with backoff)
```

### Error Classification

| Error Type | Retryable | Action |
|-----------|:---------:|--------|
| Workflow error (retryable) | Yes | BullMQ retries with exponential backoff |
| Workflow error (not retryable) | No | `UnrecoverableError` — permanent failure |
| Infrastructure error | Yes | BullMQ retries with exponential backoff |
| Unexpected error | Yes | BullMQ retries (may be transient) |

### Typed Job Schemas

Job payloads are defined in `packages/domain/`:
- `AutoAllocateWorkOrderJobV1` — work order auto-allocation
- Additional job types as features are added

The worker validates incoming jobs against these schemas before processing.

## Patterns

```
apps/worker/src/
├── bootstrap.ts                                          ← Service initialization
├── queues/
│   └── connection.ts                                     ← Redis connection for BullMQ
└── application/
    └── process-work-order-auto-allocation.ts             ← Job processor (delegates to use case)
```

The worker imports from:
- `@builders/domain` — job schemas, workflow error types
- `@builders/application` — use cases for job processing
- `@builders/db` — database client for use case execution
- `@builders/lib` — structured logging

## Anti-Patterns

1. **Do not** put business logic in job processors — delegate to `packages/application/`.
2. **Do not** enqueue jobs directly from API routes — use the outbox/relay pipeline.
3. **Do not** catch and swallow errors in processors — let BullMQ handle retries.
4. **Do not** increase concurrency without understanding the transaction isolation implications.
5. **Do not** skip structured logging — jobId and correlationId are required for debugging.

## Related Docs

- [RELAY.md](RELAY.md) — dispatches jobs to the worker
- [../patterns/OUTBOX_PATTERN.md](../patterns/OUTBOX_PATTERN.md) — end-to-end event delivery
- [../layers/APPLICATION.md](../layers/APPLICATION.md) — use cases that workers delegate to
