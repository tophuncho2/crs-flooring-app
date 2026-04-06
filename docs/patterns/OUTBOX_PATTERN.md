# Outbox Pattern

> **Scope:** Guaranteed event delivery from state mutation to asynchronous job processing.
> **Status:** Active

## Rules

1. Outbox events are written in the same database transaction as the state mutation — never separately.
2. The relay polls the outbox and dispatches to BullMQ — application code never enqueues jobs directly.
3. Events follow the state machine: `PENDING` -> `PROCESSING` -> `DISPATCHED` | `EXHAUSTED`.
4. Deterministic job IDs prevent double-dispatch even if the relay processes the same event twice.
5. Dead-lettered events (EXHAUSTED) require manual intervention — they are not auto-retried.

## Contract

### End-to-End Flow

```
API Route (mutation)
  │  withDatabaseTransaction(async (tx) => {
  │    // 1. Perform state mutation
  │    const record = await repository.create(tx, data)
  │    // 2. Write outbox event (same transaction)
  │    await createQueueOutboxEvent(tx, {
  │      queue: "auto-allocate-work-order",
  │      payload: { workOrderId: record.id },
  │    })
  │  })
  │
  ▼  (transaction committed — both record and event persisted atomically)
  
Relay (polling every 2s)
  │  1. Claim PENDING events (batch of 20)
  │  2. For each: generate deterministic BullMQ job ID
  │  3. Dispatch to BullMQ queue
  │  4. Mark as DISPATCHED (or EXHAUSTED after 5 failures)
  │
  ▼

Worker (BullMQ consumer)
  │  1. Receive job
  │  2. Validate against typed schema
  │  3. Delegate to application use case
  │  4. Success → job complete | Failure → retry with backoff
  ▼
```

### Event Shape

```typescript
createQueueOutboxEvent(tx, {
  queue: string,           // Queue name (from packages/domain/ definitions)
  payload: unknown,        // Job-specific data (typed by domain schema)
  correlationId?: string,  // Optional: trace correlation
})
```

### State Machine

| State | Meaning | Next States |
|-------|---------|-------------|
| `PENDING` | Waiting for relay pickup | `PROCESSING` |
| `PROCESSING` | Claimed by relay, dispatch in progress | `DISPATCHED`, `PENDING` (retry), `EXHAUSTED` |
| `DISPATCHED` | Successfully dispatched to BullMQ | Terminal |
| `EXHAUSTED` | Max attempts reached, dead-lettered | Terminal (manual intervention) |

### Retry Policy

- Max attempts: 5
- On dispatch failure with attempts remaining: event returns to `PENDING`
- On dispatch failure at max attempts: event moves to `EXHAUSTED`
- Claim TTL: 30 seconds (prevents stuck claims if relay crashes)

### Poison Message Detection

Events that repeatedly fail dispatch (cycling between PENDING and PROCESSING) are tracked by attempt count. At max attempts, they are moved to EXHAUSTED rather than retried indefinitely.

## Anti-Patterns

1. **Do not** write outbox events outside a transaction — breaks the delivery guarantee.
2. **Do not** enqueue BullMQ jobs directly from API routes — use the outbox.
3. **Do not** process outbox events inline — dispatch to BullMQ for async processing.
4. **Do not** auto-retry EXHAUSTED events — they require investigation.
5. **Do not** modify the state machine transitions — they are the correctness guarantee.

## Related Docs

- [../cross-cutting/TRANSACTIONS.md](../cross-cutting/TRANSACTIONS.md) — transaction boundaries
- [../services/RELAY.md](../services/RELAY.md) — relay service details
- [../services/WORKER.md](../services/WORKER.md) — worker service details
- [../execution/IDEMPOTENCY.md](../execution/IDEMPOTENCY.md) — BullMQ job ID deduplication
