# Reference Data Pattern

> **Scope:** Seeded, read-only lookup tables with no mutation surface. The pattern for modules like Unit of Measures.

## What Is Reference Data

Reference data is a curated, finite list of values that other modules reference via foreign key. It has three defining properties:

1. **Seeded at deploy time** — rows are defined in a canonical TypeScript source and inserted via an idempotent seed script. No runtime creation.
2. **Immutable via the application** — no mutation routes, no edit UI, no delete flow. The only way to change reference data is to update the seed source and re-run the seed script against the environment.
3. **Structurally locked at the database layer** — foreign key consumers use `onDelete: Restrict`. The database itself prevents deletion of referenced rows, even if a mutation path somehow leaked through.

Current reference data modules: Unit of Measures. Planned: Categories.

## Why It Exists

Some lookup tables are not user content. They are part of the product's contract — changing them is a deployment event, not a user action. Unit of Measures is the clearest example: adding "Square Feet" to the system is a schema-level decision, not something a dashboard user should be able to do at 3am. Treating these tables as editable creates three failure modes:

1. **Integrity drift** — a user deletes "Square Feet" while Categories still reference it, breaking everything downstream.
2. **Name inconsistency** — "Square Feet" and "Sq Ft" and "sqft" proliferate because there's no single source of truth.
3. **Audit noise** — mutation routes, tests, capability checks, and UI affordances exist for a table nobody should be mutating.

Reference data modules cut all three by removing the mutation surface entirely.

## Required Surface

A reference data module has only these files:
apps/web/modules/{name}/
├── CLAUDE.md                          ← Module-specific rules, links to this doc
├── types.ts                           ← Single UI row type (module root, not domain/)
├── controllers/
│   └── use-{name}-list-controller.ts  ← Minimal: rows state + notices
├── components/
│   └── list/
│       ├── {name}-client.tsx          ← useListViewEngine composition, no add button, no row-click
│       └── {name}-table.tsx           ← Plain <tr>, no ClickableTableRow, no onOpen
└── data/
└── queries.ts                     ← Re-exports read functions from @builders/db

And these supporting files outside the module:
apps/web/app/dashboard/{name}/
└── page.tsx                           ← List page only — no [id]/, no new/
apps/web/app/api/builder/{name}/
└── route.ts                           ← GET only — no POST, PATCH, DELETE, or [id]/ routes
packages/db/src/flooring/{name}/
└── read-repository.ts                 ← Read functions only, no write-repository
packages/db/src/seed/{name}.ts         ← Canonical TypeScript source
packages/db/scripts/seed-{name}.js     ← Idempotent seed script

## Explicitly Forbidden

Reference data modules must **not** have:

- `packages/application/src/flooring/{name}/` — no use cases
- `packages/domain/src/flooring/{name}/` — no domain rules (no delete rules, no name rules)
- `packages/db/src/flooring/{name}/write-repository.ts` — no write layer
- `record/` subdirectory in the module — no detail view, no create view, no record panel
- `transport/` subdirectory — GET responses are shaped by the read repository normalizer
- `views/` subdirectory — no page-level composition beyond the list view
- `domain/` subdirectory — types live at module root, business rules don't exist for reference data
- Capability entries (e.g. `{name}.edit`) — no capability is needed if no mutation route exists
- Create pages (`new/page.tsx`), detail pages (`[id]/page.tsx`), or mutation routes under `app/api/`

## List View Rules

The list view for reference data is rendered through `useListViewEngine` like any other list, but with these constraints:

1. **No add button** — the `formSlot` prop to `DashboardListPageControls` is omitted entirely.
2. **No row click** — table rows use plain `<tr>`, not `ClickableTableRow`. No `onOpen` handler. Rows do not navigate anywhere.
3. **No grouping** — every field in the field config is `groupable: false`. Page-level `tableState` passes `defaultGrouped: false`, `defaultGroupKeys: []`, `allowedGroupKeys: []`. This is belt-and-suspenders: field-level config prevents grouping at the engine; page-level config ensures stale saved preferences or URL params cannot re-enable it.
4. **Search, sort, and pagination remain** — these are read-only data exploration controls that do not imply mutability.
5. **canManage prop does not exist** — no conditional UI based on role. All roles with tool access see the same read-only list.

## Seeding

Every reference data module has:

1. **A canonical TypeScript source** at `packages/db/src/seed/{name}.ts` — exports a typed array constant (e.g. `SEEDED_UNIT_OF_MEASURES`) that is the single source of truth for what rows exist.
2. **An idempotent CommonJS seed script** at `packages/db/scripts/seed-{name}.js` — reads the canonical source, upserts each row via a find-then-create pattern, logs counts of created vs existing rows. Safe to re-run.
3. **Wiring in `packages/db/scripts/seed.js`** — the main seed script imports and calls the reference data seed function as part of the standard `db:seed` flow.
4. **A registered npm script** at both the package and root level: `db:seed:{name}`.

## Foreign Key Contract

Every foreign key referencing a reference data table must use `onDelete: Restrict`. This is the structural lock that prevents deletion even if a mutation path is introduced by mistake. The Restrict semantics:

- Attempts to delete a row fail at the database level if any FK consumer references it
- The error surfaces as a Prisma P2003 constraint violation
- No application code is required to enforce this — the database enforces it unconditionally

Modules that reference reference data (e.g. Categories referencing Unit of Measures) are free to read and link to reference data rows. They are not free to delete them.

## Capability and Tool Gating

Reference data modules are gated by **tool access only**, not by a mutation capability. The list page and GET route check:

- `requireSessionUser()` (auth)
- Tool slug (e.g. `products` for Unit of Measures) via `requireUnitOfMeasuresAccess()` or equivalent
- `capability: "system.access"` on the GET route (baseline authenticated access)

There is no `{name}.view` or `{name}.edit` capability. Any user with the relevant tool unlocked can see the list.

## Caching

Deferred. Reference data is an ideal caching target because it changes only at deploy time, but caching strategy (Next.js `unstable_cache`, HTTP `Cache-Control`, revalidation tags) is not yet part of this pattern. This section will be expanded when caching is added to the first module.

## Exception From Module Anatomy

Reference data modules deviate from the required structure defined in `apps/web/modules/CLAUDE.md` and `docs/patterns/MODULE_ANATOMY.md`. This deviation is documented as an accepted exception in `docs/patterns/ACCEPTED_EXCEPTIONS.md`.

## Related Docs

- [ACCEPTED_EXCEPTIONS.md](ACCEPTED_EXCEPTIONS.md) — the exception entry for reference data
- [MODULE_ANATOMY.md](MODULE_ANATOMY.md) — the standard module structure this deviates from
- [../engines/LIST_VIEW_ENGINE.md](../engines/LIST_VIEW_ENGINE.md) — the list engine reference data uses
- [../cross-cutting/TRANSACTIONS.md](../cross-cutting/TRANSACTIONS.md) — FK Restrict enforcement is database-level