# Application Layer

> **Scope:** Use case orchestration. Coordinates domain objects, calls data layer, dispatches outbox events.
> **Package:** `packages/application/src/`


## Rules

1. Application use cases orchestrate — they do not contain business rules of their own.
2. All business rule checks are delegated to `packages/domain/` functions.
3. All persistence is delegated to `packages/db/` repositories.
4. Every use case function accepts an optional `client` parameter for transaction propagation.
5. Outbox event dispatch is colocated with state mutation — always in the same transaction.
6. Error types are execution error classes with `code`, `status`, `field`, and `payload` properties.
7. Use cases do not import Next.js, React, or any transport/UI framework.

## Contract

Every use case follows this shape:

```typescript
export async function doSomething(
  input: ValidatedInput,
  client?: Prisma.TransactionClient
): Promise<Result> {
  // 1. Call domain functions for validation/invariants
  // 2. Call data layer for reads
  // 3. Call domain functions for computation
  // 4. Call data layer for writes (within transaction)
  // 5. Dispatch outbox event (same transaction)
  // 6. Return result
}
```

The optional `client` parameter allows the caller to wrap multiple use cases in a single transaction.

## Structure

See `packages/application/src/` for current contents. Each concern gets its own directory (e.g., `flooring/categories/`, `admin/`).

Each feature module follows the same structure: `errors.ts` + `types.ts` + `mappers.ts` + individual use case files.

## Anti-Patterns

1. **Do not** put business rules in use cases — delegate to domain.
2. **Do not** write raw SQL or Prisma queries here — delegate to `packages/db/`.
3. **Do not** import HTTP/transport concerns (Request, Response, status codes).
4. **Do not** dispatch outbox events outside the mutation transaction.
5. **Do not** call use cases from other use cases without propagating the transaction client.

## Related Docs

- [DOMAIN.md](DOMAIN.md) — business rules consumed by use cases
- [DATA.md](DATA.md) — persistence consumed by use cases
- [../patterns/OUTBOX_PATTERN.md](../patterns/OUTBOX_PATTERN.md) — outbox dispatch pattern
