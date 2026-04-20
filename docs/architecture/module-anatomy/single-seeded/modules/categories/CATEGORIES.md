# Categories

Reference data module. Seeded, read-only, FK-locked.

## Canonical Source

- **TS source:** `packages/db/src/seed/categories.ts` — `SEEDED_CATEGORIES`
- **Seed script:** `packages/db/scripts/seed-categories.js` — sync guard (regex extract + tuple compare, aborts on drift) + `prisma.$transaction()` wrapping
- **Main seed wiring:** `packages/db/scripts/seed.js`
- **Standalone:** `npm run db:seed:categories`

Each entry: `{ slug, name, sendUnitSlug, stockUnitSlug, coverageAvailableUnitSlug, itemCoverageUnitSlug, serviceUnitSlug }`. Slug is the stable identifier — renames update name and unit mappings in place. Current seed: 1 row (vinyl-plank).

## Schema

```prisma
model FlooringCategory {
  id                       String  @id @default(uuid())
  slug                     String  @unique
  name                     String  @unique
  sendUnitId               String?
  stockUnitId              String?
  coverageAvailableUnitId  String?
  itemCoverageUnitId       String?
  serviceUnitId            String?
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
}
```

Table map: `flooring_category`.

## FK Consumers (all `onDelete: Restrict`)

| Model | Field(s) | Required |
|-------|----------|----------|
| FlooringProduct | categoryId | Required |

Database-level immutability. No application code needed.

## Module Surface

```
apps/web/modules/categories/
├── CLAUDE.md
├── types.ts                                        (CategoryRow)
├── controllers/use-categories-list-controller.ts
├── components/list/categories-client.tsx            (useListViewEngine)
├── components/list/categories-table.tsx             (plain <tr>)
└── data/queries.ts                                  (re-exports from @builders/db)
```

**Routes:** `app/dashboard/categories/page.tsx` (SSR list) · `app/api/categories/route.ts` (GET only)

**Data layer:** `packages/db/src/flooring/categories/read-repository.ts` — `listCategories`, `normalizeCategoryRow`, `CategoryRecord`

## Gating

- Auth: `requireSessionUser()` via dashboard layout
- Tool: `requireCategoriesAccess()` → `products` tool slug
- Capability: `system.access` baseline on GET route; no category-specific capability
- Navigation: `FLOORING_NAV_ITEMS` entry `flooring-categories`, `requiredTool: "products"`

## Consumers of `listCategories`

- `apps/web/modules/categories/data/queries.ts` — module re-export
- `apps/web/app/api/categories/route.ts` — GET handler

Other modules (Products, Inventory) query `flooringCategory` directly via Prisma; those call sites migrate to the shared loader during their hardening sweeps.

## List View Constraints

- No add button (no `formSlot`)
- No row-click navigation (plain `<tr>`, no `ClickableTableRow`)
- No grouping — every field `groupable: false`
- Search, sort, pagination remain enabled

## Related

- [../execution-patterns/REFERENCE_DATA.md](../execution-patterns/REFERENCE_DATA.md) — pattern definition
- [../../../ACCEPTED_EXCEPTIONS.md](../../../ACCEPTED_EXCEPTIONS.md) — Exception 3
- [../../shared/list-view/LIST_VIEW_ENGINE.md](../../shared/list-view/LIST_VIEW_ENGINE.md)
