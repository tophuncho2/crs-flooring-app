# Unit of Measures Module

**Reference Data Module** — see [docs/patterns/REFERENCE_DATA.md](../../../../docs/patterns/REFERENCE_DATA.md)

Unit of Measures is a seeded, read-only reference table. Rows are defined in a canonical TypeScript source and inserted at deploy time via an idempotent seed script. There is no UI to create, edit, or delete unit of measures. All changes are made by updating the seed source and re-running the seed script against the target environment.

## Canonical Source

- **TypeScript source:** `packages/db/src/seed/unit-of-measures.ts` (`SEEDED_UNIT_OF_MEASURES` constant)
- **Seed script:** `packages/db/scripts/seed-unit-of-measures.js`
- **Wired into:** `packages/db/scripts/seed.js` (runs on `npm run db:seed`)
- **Standalone command:** `npm run db:seed:uoms`

The canonical source is the single source of truth. If a row needs to be added, removed, or renamed, edit the TypeScript source and re-run the seed script. Do not edit the database directly.

## Surface Area

This module has only:
- `types.ts` — `UnitOfMeasureRow` UI type
- `controllers/use-unit-of-measures-list-controller.ts` — minimal list controller
- `components/list/unit-of-measures-client.tsx` — list view with `useListViewEngine` composition
- `components/list/unit-of-measures-table.tsx` — plain `<tr>` table rendering
- `data/queries.ts` — re-exports read functions from `@builders/db`

Routes:
- `apps/web/app/dashboard/unit-of-measures/page.tsx` — list page (SSR)
- `apps/web/app/api/builder/unit-of-measures/route.ts` — GET only

Data layer:
- `packages/db/src/flooring/unit-of-measures/read-repository.ts` — read functions

## Explicitly Absent

Per the reference data pattern, this module has no:
- `record/`, `transport/`, `views/`, `domain/`, or `application/` subdirectories
- Detail page (`[id]/page.tsx`), create page (`new/page.tsx`), or edit UI
- Mutation routes (POST, PATCH, DELETE)
- Application use cases (`packages/application/src/flooring/unit-of-measures/` does not exist)
- Domain rules (`packages/domain/src/flooring/unit-of-measures/` does not exist)
- Write repository (`packages/db/src/flooring/unit-of-measures/write-repository.ts` does not exist)
- `unitOfMeasures.edit` capability (removed during Phase 5 hardening)

## Foreign Key Consumers

Unit of Measures is referenced by:

| Model | Field(s) | Required | onDelete |
|-------|----------|----------|----------|
| FlooringCategory | sendUnitId, stockUnitId, coverageAvailableUnitId, itemCoverageUnitId, serviceUnitId | Optional | Restrict |
| FlooringService | unitId | Required | Restrict |
| FlooringTemplateServiceItem | unitId | Required | Restrict |
| FlooringWorkOrderServiceItem | unitId | Required | Restrict |

All consumers use `onDelete: Restrict`. The database layer prevents deletion of any referenced row unconditionally. This is the structural lock that backs the application-layer immutability.

## Consumers of `listUnitOfMeasures`

The GET route (`/api/builder/unit-of-measures`) exists so other modules can populate UoM dropdowns client-side. The function is also imported directly from `@builders/db` by:

- `apps/web/modules/categories/data/queries.ts` — for category edit forms
- `apps/web/app/api/builder/unit-of-measures/route.ts` — for the GET handler

Any module needing UoM options should import `listUnitOfMeasures` from `@builders/db` directly or consume the GET endpoint.

## List View Constraints

The list view is read-only and flat:
- No "Add" button (no `formSlot` on `DashboardListPageControls`)
- No row-click navigation (plain `<tr>`, no `ClickableTableRow`)
- No grouping — every field has `groupable: false`, page passes `defaultGrouped: false`, `defaultGroupKeys: []`, `allowedGroupKeys: []`
- Search, sort, and pagination remain enabled

## Gating

- **Auth:** `requireSessionUser()` via dashboard layout
- **Tool access:** `requireUnitOfMeasuresAccess()` — gated by `products` tool slug
- **Capability:** `system.access` baseline on the GET route; no UoM-specific capability

## Related Docs

- [docs/patterns/REFERENCE_DATA.md](../../../../docs/patterns/REFERENCE_DATA.md) — the pattern definition
- [docs/patterns/ACCEPTED_EXCEPTIONS.md](../../../../docs/patterns/ACCEPTED_EXCEPTIONS.md) — Exception 3
- [apps/web/modules/CLAUDE.md](../CLAUDE.md) — modules directory rules and reference data carve-out