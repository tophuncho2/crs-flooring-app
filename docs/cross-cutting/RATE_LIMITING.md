# Rate Limiting

> **Scope:** Request rate enforcement — Redis-backed with in-memory fallback.
> **Location:** `apps/web/server/platform/rate-limit.ts`

## Rules

1. Rate limiting is enforced before any business logic executes (step 3 of the execution sequence).
2. Limits are scoped per scope identifier + per client IP (dual dimension).
3. Redis is the primary store. In-memory sliding window is the fallback when Redis is unavailable.
4. Rate limit responses return HTTP 429 with a structured error body.

## Contract

### `consumeRateLimit(options)`

```typescript
type RateLimitOptions = {
  scope: string          // Route identifier (e.g. "builder.users.update")
  clientIp: string       // From getClientIp(request)
  limit: number          // Max requests in window
  window: number         // Window duration in seconds
}

async function consumeRateLimit(options): Promise<RateLimitResult>
```

Returns whether the request is allowed or denied, with remaining quota.

### `buildRateLimitResponse(result)`

Constructs a 429 Response with:
- `error: "Rate limit exceeded"`
- `Retry-After` header
- `x-request-id` header

### Enforcement Points

| Route Type | Enforced By | Default Limits |
|------------|------------|----------------|
| **Mutations** | `applyRoutePolicy()` with `rateLimit` config | Per-route (e.g. 30/10min for user updates, 20/10min for deletes) |
| **Queries** | `enforceQueryRateLimit()` | 100 requests / 60 seconds |
| **Login** | NextAuth authorize callback | 10 attempts / 10 min per IP |
| **Registration** | Custom in register route | 5/15min anonymous, 20/15min governance |

### Fallback Behavior

When Redis is unavailable:
1. Rate limit switches to in-memory sliding window.
2. Limits are per-process (not shared across instances).
3. Logs a warning but does not fail open — limits are still enforced.

## Anti-Patterns

1. **Do not** implement rate limiting manually in route handlers — use `applyRoutePolicy()` or `enforceQueryRateLimit()`.
2. **Do not** fail open when Redis is down — the in-memory fallback exists for this reason.
3. **Do not** set rate limits per user ID — scope by route + client IP.

## Related Docs

- [../execution/EXECUTION_ENGINE.md](../execution/EXECUTION_ENGINE.md) — rate limiting is step 3
- [../execution/ROUTE_POLICY.md](../execution/ROUTE_POLICY.md) — where rate limits are enforced
