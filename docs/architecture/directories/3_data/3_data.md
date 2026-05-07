# Data

## Purpose

The data layer is the canonical boundary to persistence. It owns read and write access to Prisma, normalizes rows into domain-shaped records, and exposes a typed repository API per module. Use cases (and only use cases) consume it; routes and dashboard loaders never reach past it into Prisma directly.

## Location

- Canonical path: `packages/db/src/flooring/<module>/` or `packages/db/src//management/<module>/`
- Exported via `@builders/db`.
- Persistence code does not live inside `apps/web/modules/<module>/`.

### Note on module-level `data/` folders

`apps/web/modules/<module>/data/` exists but is **not** the data layer:

- `queries.ts` — thin server-side wrappers around `@builders/db` reads, used by dashboard loaders. Handles Prisma error → page-error translation (`PrismaPageDataResult<T>`).
- `mutations.ts` — `"use client"` HTTP functions that call API routes. These are HTTP clients, not persistence.

## Structure per module

Typical contents:

- `read-repository.ts` — read functions (`list<Module>s`, `get<Module>ById`, `get<Module>DeleteState`, `get<Module>Options`).
- `write-repository.ts` — write functions (`create<Module>Record`, `update<Module>Record`, `delete<Module>ById`).
- Normalizers — Prisma row → domain record mappers handling Date → ISO string, null coalescing, relation counts, and enum label mapping. May be colocated in `read-repository.ts` or split out.
- Include/select shape constants.
- `index.ts` — barrel file.

## Function conventions

- All repository functions accept an optional `client: <Module>DbClient = db` (union of `PrismaClient | Prisma.TransactionClient`) so callers can thread a transaction.
- Reads: `list*`, `get*ById`, `get*State`, `get*Options`.
- Writes: `create*Record`, `update*Record`, `delete*ById` — accept typed input, return a normalized record or void.
- The Prisma client is centrally exported from `packages/db/src/client.ts` as `db`. No other module instantiates `PrismaClient`.

## What belongs here

- Prisma queries and mutations.
- Normalizers between Prisma rows and domain records.
- Include/select shape definitions.
- Transaction-aware repository functions.

## What does NOT belong

- Business rules or invariants (belong in domain).
- Use-case orchestration or multi-step workflows (belong in application).
- HTTP status codes, route policies, or response shaping.
- React / JSX.

## Error translation

- The data layer returns raw Prisma errors. It does not translate them into domain errors.
- Application use cases catch `Prisma.PrismaClientKnownRequestError` and throw module-scoped execution errors.
- Module-level `queries.ts` wraps Prisma errors into `PrismaPageDataResult<T>` for the dashboard loader consumer.

## Example

```typescript
// packages/db/src/flooring/<module>/read-repository.ts
export async function get<Module>ById(id: string, client = db): Promise<<Module>Record> {
  const row = await client.flooring<Module>.findUniqueOrThrow({
    where: { id },
    include: <module>CountInclude,
  })
  return normalize<Module>Detail(row)
}
```

## Violations checklist

- [ ] Data function imports from `@builders/application` or any module directory (`apps/web/modules/…`).
- [ ] Repository function performs business-rule validation (belongs in domain or use case).
- [ ] Repository function shapes an HTTP response or throws `Response` / `NextResponse`.
- [ ] Persistence code placed under `apps/web/modules/<module>/data/` instead of `packages/db/src/flooring/<module>/`.
- [ ] `apps/web/modules/<module>/data/mutations.ts` performs Prisma writes directly instead of HTTP-calling an API route.
- [ ] Normalizer placed in the application or domain layer instead of the data layer.
- [ ] Prisma client imported from anywhere other than `packages/db/src/client.ts`.
- [ ] Repository function omits the optional `client` transaction parameter.
- [ ] Raw Prisma row returned to callers without normalization.
- [ ] Raw Prisma error propagated to an API route unconverted (should be caught in the use case).
