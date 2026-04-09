# Execution Engine

> **Scope:** The 9-step sequence every execution path follows across HTTP routes, workers, and relay.

## Rules

1. Every execution path follows the same 9-step sequence, in order.
2. No step may be skipped unless documented in [ACCEPTED_EXCEPTIONS](../patterns/ACCEPTED_EXCEPTIONS.md).
3. Failures at any step halt execution and return a structured error response.

## The 9-Step Sequence

| Step | Name | What Happens |
|------|------|-------------|
| 1 | **Authentication** | Identity resolved or halt. Session user extracted. |
| 2 | **Authorization** | Permissions checked — capability, tool access, verification status. |
| 3 | **Rate Limiting** | Enforced before any work. Sliding window per scope + client IP. |
| 4 | **Input Validation** | Request payload validated against schema. Field-level errors returned. |
| 5 | **Idempotency** | Duplicate mutations short-circuited via mutation receipts. |
| 6 | **Transaction Boundary** | Explicit `withDatabaseTransaction()` opened for mutations. |
| 7 | **Application Layer** | Use case executed within transaction. Domain rules enforced. |
| 8 | **Error Handling** | Errors caught, classified, structured into response shape. |
| 9 | **Observability** | Structured logs emitted. Trace context propagated. |

## Entry Points

### HTTP Routes (Primary)

`applyRoutePolicy()` in `server/http/route-policy.ts` is the canonical HTTP entry point. It handles steps 1-3 and provides the context for steps 4-9.

See [ROUTE_POLICY.md](ROUTE_POLICY.md) for the full contract.

### Worker (Job Processing)

BullMQ worker in `apps/worker/` processes jobs dispatched via the outbox/relay pipeline:

1. **Authentication** — implicit (internal service, no user session)
2. **Authorization** — implicit (job was authorized at enqueue time)
3. **Rate limiting** — BullMQ concurrency controls
4. **Input validation** — typed job schema from `packages/domain/`
5. **Idempotency** — BullMQ job ID deduplication
6. **Transaction** — use case manages its own transaction
7. **Application** — delegates to `packages/application/` use case
8. **Error handling** — `isWorkflowProcessingError` + retryable classification
9. **Observability** — structured logging with jobId, correlationId, attempt

See [../services/WORKER.md](../services/WORKER.md) for details.

### Relay (Infrastructure)

`apps/relay/` is infrastructure, not a request handler. It polls the outbox and dispatches to BullMQ. It does not execute the 9-step sequence — it is the bridge between steps 6 (transaction) and the worker.

See [../services/RELAY.md](../services/RELAY.md) for details.

## Accepted Exceptions

Three execution paths deviate from the standard sequence:

1. **Admin-only endpoints** skip optimistic concurrency (step 5 simplified).
2. **Account preference routes** are idempotent upserts (step 5 implicit).

See [../patterns/ACCEPTED_EXCEPTIONS.md](../patterns/ACCEPTED_EXCEPTIONS.md) for full documentation.

## Related Docs

- [ROUTE_POLICY.md](ROUTE_POLICY.md) — HTTP entry point details
- [ERROR_HANDLING.md](ERROR_HANDLING.md) — error classification and response shapes
- [IDEMPOTENCY.md](IDEMPOTENCY.md) — mutation receipt system
- [../services/WORKER.md](../services/WORKER.md) — job processing entry point
- [../services/RELAY.md](../services/RELAY.md) — outbox relay infrastructure
