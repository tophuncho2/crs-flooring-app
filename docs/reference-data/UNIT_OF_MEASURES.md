# Unit of Measures

Reference data module. Seeded, read-only, FK-locked.

## Canonical Source

- **TS source:** `packages/db/src/seed/unit-of-measures.ts` — `SEEDED_UNIT_OF_MEASURES`
- **Seed script:** `packages/db/scripts/seed-unit-of-measures.js` — sync guard (regex extract + tuple compare, aborts on drift) + `prisma.$transaction()` wrapping
- **Main seed wiring:** `packages/db/scripts/seed.js`
- **Standalone:** `npm run db:seed:uoms`

Each entry: `{ slug, name, abbreviation }`. Slug is the stable identifier — renames update name/abbreviation in place. Current seed: 11 rows (linear-feet, square-feet, square-yard, buckets, boxes, units, bags, pieces, sheets, rolls, gallons).

## Schema

```prisma
model FlooringUnitOfMeasure {
  id           String @id @default(uuid())
  slug         String @unique
  name         String @unique
  abbreviation String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## FK Consumers (all `onDelete: Restrict`)

| Model | Field(s) | Required |
|-------|----------|----------|
| FlooringCategory | sendUnitId, stockUnitId, coverageAvailableUnitId, itemCoverageUnitId, serviceUnitId | Optional |
| FlooringService | unitId | Required |
| FlooringTemplateServiceItem | unitId | Required |
| FlooringWorkOrderServiceItem | unitId | Required |

Database-level immutability. No application code needed.

## Module Surface

```
apps/web/modules/unit-of-measures/
├── CLAUDE.md
├── types.ts                                           (UnitOfMeasureRow)
├── controllers/use-unit-of-measures-list-controller.ts
├── components/list/unit-of-measures-client.tsx        (useListViewEngine)
├── components/list/unit-of-measures-table.tsx         (plain <tr>)
└── data/queries.ts                                    (re-exports from @builders/db)
```

**Routes:** `app/dashboard/unit-of-measures/page.tsx` (SSR list) · `app/api/builder/unit-of-measures/route.ts` (GET only)

**Data layer:** `packages/db/src/flooring/unit-of-measures/read-repository.ts` — `listUnitOfMeasures`, `getUnitOfMeasuresPageData`, `UnitOfMeasureRecord`

## Gating

- Auth: `requireSessionUser()` via dashboard layout
- Tool: `requireUnitOfMeasuresAccess()` → `products` tool slug
- Capability: `system.access` baseline on GET route; no UoM-specific capability
- Navigation: `FLOORING_NAV_ITEMS` entry `flooring-unit-of-measures`, `requiredTool: "products"`

## Consumers of `listUnitOfMeasures`

- `apps/web/modules/categories/data/queries.ts` — category edit dropdowns
- `apps/web/app/api/builder/unit-of-measures/route.ts` — GET handler
- `apps/web/modules/unit-of-measures/data/queries.ts` — module re-export

Other modules (Services, Templates, WorkOrders) query `flooringUnitOfMeasure` directly via Prisma; those call sites should migrate to `listUnitOfMeasures` during their hardening sweeps.

## List View Constraints

- No add button (no `formSlot`)
- No row-click navigation (plain `<tr>`, no `ClickableTableRow`)
- No grouping — every field `groupable: false`
- Search, sort, pagination remain enabled

## Related

- [../patterns/REFERENCE_DATA.md](../patterns/REFERENCE_DATA.md) — pattern definition
- [../patterns/ACCEPTED_EXCEPTIONS.md](../patterns/ACCEPTED_EXCEPTIONS.md) — Exception 3
- [../engines/LIST_VIEW_ENGINE.md](../engines/LIST_VIEW_ENGINE.md)
