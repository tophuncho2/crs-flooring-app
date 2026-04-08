# Observability

> **Scope:** Structured logging, tracing, Sentry integration, request ID propagation.
> **Location:** `packages/lib/`, `apps/web/server/platform/logger.ts`, `apps/web/server/platform/request-context.ts`

## Rules

1. All log output uses `logStructuredEvent()` from `packages/lib` — no `console.log` in production code.
2. Every log event is a single-line JSON object (Railway-compatible).
3. `x-request-id` is propagated through the entire request lifecycle.
4. Sentry captures unexpected errors with 10% trace sampling.
5. Mutation routes emit telemetry via `withMutationTelemetry()`.

## Contract

### `logStructuredEvent(event)`

```typescript
type StructuredLogEvent = {
  timestamp: string       // ISO 8601
  level: "info" | "warn" | "error"
  service: string         // "web", "relay", "worker"
  environment: string     // "development", "staging", "production"
  action: string          // What happened
  requestId?: string      // Correlation ID
  [key: string]: unknown  // Additional context
}
```

Output: single-line JSON to stdout. Railway ingests this format directly.

### Request ID Propagation

```
Client request
  → x-request-id header (or generated)
  → getRequestId(request) extracts/generates
  → Passed through AuthorizedRouteContext
  → Included in all log events
  → Returned in response via withRequestId() / jsonWithRequestId()
```

### `withMutationTelemetry()`

Wraps mutation route handlers to emit structured events:
- Start event: action, userId, scope
- Success event: action, userId, duration
- Failure event: action, userId, error classification, duration

### Sentry Integration

- 10% trace sampling rate in production.
- Unexpected errors (uncaught exceptions, 500 responses) captured with context.
- Request ID and user ID attached to Sentry events.

## Anti-Patterns

1. **Do not** use `console.log` — use `logStructuredEvent()`.
2. **Do not** log sensitive data (passwords, tokens, PII beyond email).
3. **Do not** skip request ID propagation — it enables end-to-end tracing.
4. **Do not** log at `error` level for expected conditions (rate limits, validation failures).

## Related Docs

- [../execution/EXECUTION_ENGINE.md](../execution/EXECUTION_ENGINE.md) — observability is step 9
- [../execution/ROUTE_POLICY.md](../execution/ROUTE_POLICY.md) — mutation telemetry integration
