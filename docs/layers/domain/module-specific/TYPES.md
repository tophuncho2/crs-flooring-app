# Types

> **What:** Shared TypeScript types that describe domain entities and the shapes passed between layers. Plain data only — no Prisma, no framework types.

## Where

Per-concern `types.ts` files under `packages/domain/src/`.

## Exports

`type` aliases for domain entities, input/output DTOs for rules, `EMPTY_*_FORM` constants, `to*Form` converters, and narrow unions used by predicates and diff rules. Zod schemas are not used in `types.ts` files — the only Zod usage in domain is queue payload schemas under `packages/domain/src/queue/`.

## Example

`GovernableRole`, `GovernanceActor`, `GovernanceTarget` in `packages/domain/src/admin/types.ts`.
