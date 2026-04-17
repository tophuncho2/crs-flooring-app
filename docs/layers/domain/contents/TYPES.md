# Types

> **What:** Shared TypeScript types that describe domain entities and the shapes passed between layers. Plain data only — no Prisma, no framework types.

## Where

Per-concern `types.ts` files under `packages/domain/src/`.

## Exports

`type` aliases for domain entities, input/output DTOs for rules, and narrow unions used by predicates and diff rules. Zod schemas that parse external input belong here too.

## Example

`GovernableRole`, `GovernanceActor`, `GovernanceTarget` in `packages/domain/src/admin/types.ts`.
