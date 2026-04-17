# API Design

> **Scope:** Route conventions, response shapes, endpoint naming, and query/mutation separation.
> **Location:** `apps/web/app/api/`, `apps/web/server/http/`
> **Grade: A-** — Highly consistent across 73 route files. Strong middleware chain, idempotency, and error normalization.

## Rules

1. All routes follow the Next.js App Router convention: `app/api/{resource}/route.ts` exports named HTTP method handlers (`GET`, `POST`, `PATCH`, `DELETE`).
2. **GET = query, POST/PATCH/DELETE = mutation.** No exceptions. Queries are read-only; mutations require an envelope with `idempotencyKey`.
3. Every response passes through `routeJson(access, body, options?)` or `routeError(access, error)`. No raw `Response` construction in route files.
4. Response bodies use a **resource-keyed envelope**: `{ product: {...} }` for singles, `{ products: [...] }` for lists. Never `{ data: ... }`.
5. PATCH for updates, never PUT. DELETE returns `{ ok: true }`.
6. All responses include an `x-request-id` header via `jsonWithRequestId()`.
7. No API versioning. Breaking changes are avoided by evolving response shapes or adding new sub-resource routes.

## Contract

### Standard Route Structure

Every route handler follows this sequence:

```typescript
export async function POST(request: Request, context: RouteContext) {
  try {
    // 1. Auth + rate limiting
    const access = await applyRoutePolicy(request, {
      require: "products",
      toolSlug: "products",
      rateLimit: { scope: "products.create", limit: 60, window: "10m" },
    })
    if (access instanceof Response) return access

    // 2. Parse params
    const { id } = await context.params

    // 3. Parse mutation envelope
    const body = await request.json()
    const { input, mutation } = parseMutationEnvelope(body, validateCreateProductInput)

    // 4. Idempotency check
    const receipt = await enforceMutationReceipt({ scope, request, access, mutation, body })
    if (receipt.replay) return receipt.replay

    // 5. Business logic (wrapped in telemetry)
    const result = await withMutationTelemetry(access, metadata, () =>
      createProduct(input, access.user)
    )

    // 6. Finalize receipt
    const responseBody = { product: result }
    await finalizeMutationReceipt({ scope, access, mutation, responseStatus: 201, responseBody })

    // 7. Return
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
```

Query routes omit steps 3-6 and use `enforceQueryRateLimit()` instead.

### Response Shapes

```typescript
// Single resource
{ product: { id, name, ... } }

// List
{ products: [{ id, name, ... }] }

// Delete
{ ok: true }

// Action with side effects
{ workOrder: {...}, allocations: [...] }

// Error (4xx/5xx)
{ error: "message", field?: "fieldName" }

// Conflict with snapshot (409)
{ error: "message", field: "updatedAt", snapshot: { workOrder: {...} } }
```

### Endpoint Naming

| Pattern | Example | Method |
|---------|---------|--------|
| List / Create | `/api/products` | GET / POST |
| Read / Update / Delete | `/api/products/[id]` | GET / PATCH / DELETE |
| Nested resource | `/api/work-orders/[id]/items/[itemId]/allocations` | GET / POST |
| Action (RPC-style) | `/api/work-orders/[id]/auto-allocation` | POST |
| Options (form data) | `/api/products/options` | GET |
| Section batch update | `/api/work-orders/[id]/items/section` | PATCH |

### Middleware Chain

Applied via `applyRoutePolicy()` and mutation helpers:

| Layer | Utility | Purpose |
|-------|---------|---------|
| Auth | `applyRoutePolicy()` | Session validation, capability check |
| Rate limiting | `enforceQueryRateLimit()` / embedded in policy | Per-scope limits (100/min query, custom for mutations) |
| Idempotency | `enforceMutationReceipt()` | Dedup by hashed body, 24h TTL |
| Concurrency | `assertExpectedUpdatedAt()` | Optimistic locking on PATCH/DELETE |
| Telemetry | `withMutationTelemetry()` | Structured audit logging |
| Error normalization | `routeError()` | Prisma → AppError mapping |

### Prisma Error Mapping

| Prisma Code | HTTP Status | Meaning |
|-------------|-------------|---------|
| P2002 | 409 | Unique constraint violation |
| P2025 | 404 | Record not found |
| P2003 | 409 | Foreign key constraint (linked record) |

## Patterns

- **19 resource domains** with 73 route files total.
- Auth routes (`/api/auth/*`) are the only exception to standard policy — they handle authentication themselves.
- Transport builders (e.g., `buildWorkOrderAutoAllocationStatusResponse()`) normalize complex query results into response shapes.
- Capability-filtered responses use `withWorkOrderCapabilities()` to strip fields based on user role.

## Anti-Patterns

1. **Do not** construct `new Response()` directly in route files. Use `routeJson()` and `routeError()`.
2. **Do not** use `{ data: ... }` or `{ success: true, data: ... }` envelopes. Use resource-keyed shapes.
3. **Do not** use PUT. PATCH handles all updates with partial field semantics.
4. **Do not** skip the mutation envelope for write operations. Every POST/PATCH/DELETE requires `parseMutationEnvelope()`.
5. **Do not** add API version prefixes. Evolve existing routes or add new sub-resources.
6. **Do not** handle errors inline — always let them propagate to the `catch` block and `routeError()`.

## Gaps

- **No OpenAPI/Swagger spec.** Route contracts are enforced by convention, not generated documentation.
- **No pagination standard.** List endpoints return full result sets; cursor/offset pagination is not formalized.
- **No bulk mutation convention.** Section batch updates exist for work order items but the pattern isn't generalized.

## Related Docs

- [ROUTE_POLICY.md](../../server/ROUTE_POLICY.md) — detailed policy wiring and middleware sequence
- [EXECUTION_ENGINE.md](../../server/EXECUTION_ENGINE.md) — the 9-step execution sequence
- [ERROR_HANDLING.md](../../application/ERROR_HANDLING.md) — error classification and AppError shape
- [IDEMPOTENCY.md](../../server/IDEMPOTENCY.md) — mutation receipt lifecycle
- [RATE_LIMITING.md](../../server/RATE_LIMITING.md) — rate limit scopes and windows
- [VALIDATION.md](../../server/VALIDATION.md) — input validation conventions
- [../../controllers/TRANSPORT.md](../../controllers/TRANSPORT.md) — client-side transport that targets these routes
