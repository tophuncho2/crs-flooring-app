# Single-Seeded — `types.ts` Location

> Single-seeded modules keep `types.ts` at the root of `apps/web/modules/{name}/`. It is not promoted into `@builders/domain`.

## Where

`apps/web/modules/{name}/types.ts`

Verified in both references:

- `apps/web/modules/categories/types.ts` → exports `CategoryRow`
- `apps/web/modules/unit-of-measures/types.ts` → exports `UnitOfMeasureRow`

## Why local, not domain

Single-seeded has no domain layer entry — no `packages/domain/src/flooring/{name}/`. The module has:
- No rules (`*-rules.ts`)
- No form triad (`{Name}Form`, `EMPTY_{NAME}_FORM`, `to{Name}Form`)
- No validators
- No diff infrastructure

A `Row` type with no partners in domain doesn't justify a domain directory. The type stays where it's used — the web module.

## Who imports it

Module-internal only. For each single-seeded module, three files:

- `components/list/{name}-client.tsx`
- `components/list/{name}-table.tsx`
- `controllers/use-{name}-list-controller.ts`

Nothing outside the module imports it. Not the API route, not the dashboard page, not any other module.


