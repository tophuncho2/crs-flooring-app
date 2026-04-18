# Route Policy

> **Scope:** HTTP route protection — the `applyRoutePolicy()` contract and mutation lifecycle.
> **Location:** `apps/web/server/http/route-policy.ts`

## Rules

1. All API routes (except auth handler routes) use `applyRoutePolicy()` as the entry point.
2. Mutation routes must use the full mutation lifecycle: parse envelope -> check receipt -> execute -> finalize receipt.
3. Query routes use `enforceQueryRateLimit()` for rate limiting (100 requests / 60 seconds).
4. The deprecated `route-helpers.ts` contains `requireRouteAccess()` and `enforceRouteRateLimit()` which are being removed per FLO-32.

## Contract

### `applyRoutePolicy(request, policy)`

The canonical entry point for all protected API routes.

```typescript
type RoutePolicy = {
  capability?: Capability
  toolSlug?: ToolSlug
  allowUnverified?: boolean
  rateLimit?: { limit: number; window: number }
}

async function applyRoutePolicy(
  request: Request,
  policy: RoutePolicy
): Promise<AuthorizedRouteContext | Response>
```

Steps performed:
1. Resolve session user (401 if missing)
2. Check system access (403 if denied)
3. Check verification status (403 if unverified and not bypassed)
4. Check capability (403 if missing)
5. Check tool access (403 if locked)
6. Enforce rate limit (429 if exceeded)
7. Return `AuthorizedRouteContext { user, requestId, clientIp }`

### Mutation Lifecycle

For mutation routes (POST, PATCH, DELETE), the full lifecycle:

```typescript
// 1. Apply route policy
const access = await applyRoutePolicy(request, policy)
if (access instanceof Response) return access

// 2. Parse mutation envelope (extracts payload + idempotency metadata)
const { data, meta } = await parseMutationEnvelope(request)

// 3. Check for duplicate (short-circuit if receipt exists)
const receipt = await enforceMutationReceipt(access, meta)
if (receipt.duplicate) return receipt.response

// 4. Execute use case (within transaction)
const result = await doSomething(data)

// 5. Finalize receipt (cache response for replay)
await finalizeMutationReceipt(receipt, result)

// 6. Return response
return routeJson(result)
```

### `parseMutationEnvelope(request)`

Extracts the mutation payload and metadata from the request body:

```typescript
type MutationMeta = {
  idempotencyKey: string
  scope: string
  requestHash: string
}
```

### `enforceMutationReceipt(access, meta)`

Checks if this mutation was already processed. Returns cached response if duplicate.

### `finalizeMutationReceipt(receipt, result)`

Stores the response for future replay within the 24-hour receipt window.

### `assertExpectedUpdatedAt(expected, actual)`

Optimistic concurrency control. Compares client's `expectedUpdatedAt` with server's actual value. Throws 409 on mismatch.

### `enforceQueryRateLimit(access)`

Rate limits query (GET) routes. Default: 100 requests per 60 seconds per scope + client IP.

## Anti-Patterns

1. **Do not** call `authorizeRouteAccess()` directly — use `applyRoutePolicy()` which wraps it.
2. **Do not** skip the mutation receipt lifecycle for POST/PATCH/DELETE routes.
3. **Do not** use the deprecated `requireRouteAccess()` from `route-helpers.ts`.
4. **Do not** handle rate limiting manually — let the policy engine enforce it.

## Related Docs

- [EXECUTION_ENGINE.md](EXECUTION_ENGINE.md) — the 9-step sequence this implements
- [IDEMPOTENCY.md](IDEMPOTENCY.md) — mutation receipt details
- [../application/ERROR_HANDLING.md](../application/ERROR_HANDLING.md) — how errors are classified and returned
