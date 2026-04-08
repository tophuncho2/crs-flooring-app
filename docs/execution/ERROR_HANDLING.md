# Error Handling

> **Scope:** Error classification, Prisma error normalization, structured error responses.
> **Location:** `apps/web/server/http/api-helpers.ts`, `apps/web/server/http/route-helpers.ts`


## Rules

1. All errors are classified into one of five categories before being returned to the client.
2. Error responses follow a consistent shape with `error` message, optional `field`, and appropriate HTTP status.
3. Prisma errors are normalized into application errors — raw database errors never reach the client.
4. Unexpected errors are caught, logged to Sentry, and returned as generic 500 responses.

## Error Classification Hierarchy

| Category | HTTP Status | Source | Example |
|----------|-------------|--------|---------|
| **Validation** | 400 | Input parsing failure | Missing required field, invalid format |
| **Authorization** | 401 / 403 | Auth/capability check | No session, insufficient role |
| **Domain** | 409 / 422 | Business rule violation | Delete blocked by linked records, duplicate name |
| **Infrastructure** | 429 / 503 | System constraint | Rate limit exceeded, database connectivity |
| **Unexpected** | 500 | Uncaught error | Unhandled exception |

## Contract

### `createAppError(message, options?)`

Creates a structured application error:

```typescript
createAppError("Location is invalid", {
  field: "locationId",      // Optional: which field caused the error
  status: 400,              // Optional: HTTP status (default 400)
  payload: { ... },         // Optional: additional error data
})
```

### `normalizePrismaError(error)`

Maps Prisma error codes to HTTP responses:

| Prisma Code | HTTP Status | Meaning |
|-------------|-------------|---------|
| `P2002` | 409 | Unique constraint violation |
| `P2003` | 409 | Foreign key constraint (linked records) |
| `P2025` | 404 | Record not found |
| Other | 500 | Unexpected database error |

### Response Shape

All error responses follow:

```json
{
  "error": "Human-readable error message",
  "field": "fieldName"
}
```

Headers include `x-request-id` for correlation.

### `routeJson(data, status?)` and `routeError(message, status?)`

Standard response helpers used by all 72 API routes. Currently in `route-helpers.ts` (being relocated per FLO-32).

## Patterns

- **Validation errors:** Thrown by `parseRequiredString()`, `parseUuidParam()`, and other parsing helpers in `api-helpers.ts`.
- **Domain errors:** Thrown by application use cases with typed codes (`CategoryDeleteBlockedError`, etc.).
- **Prisma errors:** Caught in route handlers and normalized via `normalizePrismaError()`.
- **Sentry:** Unexpected errors reported with 10% trace sampling. Structured context attached.

## Anti-Patterns

1. **Do not** return raw Prisma errors to the client — always normalize.
2. **Do not** use generic `Error` in application/domain code — use typed error classes.
3. **Do not** swallow errors silently — log and report unexpected errors.
4. **Do not** return stack traces in production responses.
5. **Do not** use inconsistent error response shapes — all errors must include `error` field.

## Related Docs

- [ROUTE_POLICY.md](ROUTE_POLICY.md) — where errors are caught in the route lifecycle
- [EXECUTION_ENGINE.md](EXECUTION_ENGINE.md) — error handling is step 8 of the sequence
- [../cross-cutting/OBSERVABILITY.md](../cross-cutting/OBSERVABILITY.md) — error logging and Sentry
