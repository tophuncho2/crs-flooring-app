# Single-Seeded — Reads

> The database read surface single-seeded modules consume from `@builders/db`. Evidence: `packages/db/src/flooring/{categories,unit-of-measures}/read-repository.ts`.

## Where

`packages/db/src/flooring/{name}/read-repository.ts`

No `write-repository.ts` — single-seeded tables have no runtime write path.

## What's exported

At minimum, a list reader: `list{Name}s`. Each reference module wraps Prisma with a small normalizer step and returns plain, framework-free records.

- `categories` → exports `categoryInclude` (Prisma `include` shape for unit FKs) plus the normalizer that flattens joined unit names into string fields, producing the `CategoryRecord` shape consumed downstream.
- `unit-of-measures` → exports `normalizeUnitOfMeasureRow` and a typed `UnitOfMeasureRecord` DTO. The repository also re-exports `withPrismaConnectivityHandling` usage patterns for detail-read helpers where the dashboard `data/queries.ts` needs them.

## Consumers (single-seeded-only surface)

- **API route** — imports `list{Name}s` directly and returns the rows under a resource-keyed envelope. See `app/API.md`.
- **Dashboard page** — imports `get{Name}PageData` from `modules/{name}/data/queries.ts`, which wraps `list{Name}s` in `withPrismaConnectivityHandling`. See `app/DASHBOARD.md` and [`../../QUERIES.md`](../../QUERIES.md).

No use cases call these readers for single-seeded — there's no application-layer entry for reference data.

## Contract

- The repository owns all Prisma access and all row-shape normalization. Nothing above the data layer sees a raw Prisma model.
- Normalized records are plain data — `Date`s become ISO strings, FKs are flattened to id + display pairs where appropriate.
- No rule evaluation. Reads return what's in the DB; filtering / sorting / search happens in the list engine on the client.

## Anti-patterns

1. **Do not** add a `write-repository.ts`. Single-seeded has no write surface at runtime.
2. **Do not** import `@prisma/client` above the repository. Module consumers take the normalized record type.
3. **Do not** add per-field transformations here that belong in UI (e.g. formatting dates for display). The repository shape must stay framework-free.
4. **Do not** introduce a second list reader variant for filtering — the list engine filters client-side from the single read.
