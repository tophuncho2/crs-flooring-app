# Application

## Purpose

The application layer owns use cases: the discrete workflows the system supports. A use case is the single unit of orchestration between domain rules and data access. Routes call use cases, use cases call domain and data, and domain and data have no knowledge of either routes or each other.

## Location

- Canonical path: `packages/application/src/flooring/<module>/`
- Exported via `@builders/application`.
- Application code does not live inside `apps/web/modules/<module>/`.

## Structure per module

Typical contents:

- `create-<module>.ts` — `create<Module>UseCase(input, client?)`.
- `update-<module>.ts` — `update<Module>UseCase(id, input, client?)`.
- `delete-<module>.ts` — `delete<Module>UseCase(id, client?)`.
- `errors.ts` — module-scoped execution error class (`<Module>ExecutionError`).
- `types.ts` — input/output types consumed by use cases.
- `index.ts` — barrel file.

## Use case conventions

- Exported as named async functions, not classes.
- Signature: `<verb><Module>UseCase(...args, client?: Prisma.TransactionClient)`. The optional client lets a caller compose use cases inside a larger transaction.
- Wrap multi-step logic in `withDatabaseTransaction` (or the project's equivalent) when atomicity is required.
- Throw module-scoped execution errors (`<Module>ExecutionError`) with a `code`, optional `field`, and status hint. Never throw generic `Error`.
- Catch `Prisma.PrismaClientKnownRequestError` and translate it to a module-scoped execution error (e.g. unique-constraint → `<MODULE>_NAME_CONFLICT`).

## What belongs here

- Orchestration: sequencing domain validation, repository reads, and repository writes.
- Translation of Prisma errors into module-scoped execution errors.
- Composition of multiple repositories or domain rules into a single coherent action.
- Computed outputs that a route returns verbatim.

## What does NOT belong

- HTTP concerns (`Request`, `Response`, `NextResponse`, status codes beyond error hints).
- Rendering, React, or `"use server"` directives.
- Domain rules (belong in `@builders/domain`) or persistence (belong in `@builders/db`).
- Session handling, rate limiting, idempotency receipts, or optimistic-lock checks — those are route-level concerns.

## Import rules

- **May import**: `@builders/domain`, `@builders/db`, Prisma types.
- **Must not import**: routes, pages, React code, `@/modules/...`.
- Use cases should not import each other unless the higher-level use case genuinely composes the other.

## Example

```typescript
// packages/application/src/flooring/<module>/delete-<module>.ts
export async function delete<Module>UseCase(id: string, client?: Prisma.TransactionClient) {
  return withDatabaseTransaction(async (tx) => {
    const linkState = await get<Module>DeleteState(id, tx)
    if (is<Module>DeleteBlocked(linkState)) {
      throw new <Module>ExecutionError({ code: "<MODULE>_IN_USE" })
    }
    await delete<Module>ById(id, tx)
    return { ok: true }
  }, client)
}
```

## Violations checklist

- [ ] Use case imports from `apps/web/app/...` or any module directory (`apps/web/modules/…`).
- [ ] Use case accesses `Request` / `Response` / `NextResponse` or reads HTTP headers directly.
- [ ] Use case calls Prisma directly instead of going through `@builders/db` repositories.
- [ ] Use case defines a domain rule or invariant inline instead of delegating to `@builders/domain`.
- [ ] Use case throws a generic `Error` or string instead of a module-scoped execution error.
- [ ] Use case omits the optional transaction `client` parameter, preventing composition.
- [ ] Multi-step write not wrapped in `withDatabaseTransaction` where atomicity is required.
- [ ] Route policy concerns (rate limits, idempotency receipts, optimistic locks) performed inside the use case.
- [ ] Use case returns a framework-shaped object (e.g. `{ status: 200, body }`) instead of a domain record or execution error.
- [ ] Use case file placed under `apps/web/modules/<module>/application/` instead of `packages/application/src/flooring/<module>/`.
