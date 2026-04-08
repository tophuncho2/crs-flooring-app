# Relay Service

> **Scope:** Outbox relay — polls outbox table, claims events, dispatches to BullMQ.
> **Location:** `apps/relay/`

## Rules

1. The relay is infrastructure — it does not execute business logic.
2. It polls the outbox table on a fixed interval and dispatches claimed events to BullMQ.
3. Each event follows the outbox state machine: `PENDING` -> `PROCESSING` -> `DISPATCHED` | `EXHAUSTED`.
4. Job IDs are deterministic via `toBullMqJobId()` — same event always produces the same job ID.
5. Dead-letter after max attempts — events move to `EXHAUSTED` state.

## Configuration

| Setting | Default | Purpose |
|---------|---------|---------|
| Polling interval | 2 seconds | How often the relay checks for pending events |
| Batch size | 20 | Max events claimed per poll cycle |
| Claim TTL | 30 seconds | How long a claimed event is locked before release |
| Max attempts | 5 | Attempts before moving to EXHAUSTED |

## Contract

### Outbox State Machine

```
PENDING
  │  Relay claims the event (sets processingStartedAt)
  ▼
PROCESSING
  │
  ├─ Success: dispatch to BullMQ → DISPATCHED
  │
  └─ Failure:
      ├─ attempts < maxAttempts → back to PENDING (retry)
      └─ attempts >= maxAttempts → EXHAUSTED (dead letter)
```

### `toBullMqJobId(outboxEvent)`

Generates a deterministic BullMQ job ID from the outbox event:
- Same event always produces the same job ID.
- BullMQ rejects duplicate job IDs, preventing double-dispatch.

### Dispatch Flow

```
1. Poll: SELECT outbox events WHERE state = PENDING LIMIT batchSize
2. Claim: UPDATE state = PROCESSING, increment attempts
3. For each event:
   a. Build BullMQ job payload from event data
   b. Generate deterministic job ID
   c. Add job to BullMQ queue
   d. On success: UPDATE state = DISPATCHED
   e. On failure: UPDATE state = PENDING (will retry) or EXHAUSTED (dead letter)
```

## Structure

```
apps/relay/src/
├── bootstrap.ts                                    ← Service initialization
├── bull-board.ts                                   ← BullMQ dashboard (dev)
└── dispatch/
    └── work-order-allocation-outbox-dispatcher.ts  ← Event-to-job mapping
```

The relay imports from:
- `@builders/db` — outbox repository, database environment
- `@builders/domain` — queue definitions, job schemas
- `@builders/lib` — structured logging, Redis connection parsing

## Anti-Patterns

1. **Do not** put business logic in the relay — it is a transport bridge only.
2. **Do not** process events inline — dispatch to BullMQ and let the worker handle it.
3. **Do not** skip the deterministic job ID — it prevents double-dispatch.
4. **Do not** increase batch size beyond what the claim TTL can handle.

## Related Docs

- [WORKER.md](WORKER.md) — processes the jobs dispatched by the relay
- [../patterns/OUTBOX_PATTERN.md](../patterns/OUTBOX_PATTERN.md) — end-to-end outbox flow
- [../cross-cutting/TRANSACTIONS.md](../cross-cutting/TRANSACTIONS.md) — outbox write in same transaction
