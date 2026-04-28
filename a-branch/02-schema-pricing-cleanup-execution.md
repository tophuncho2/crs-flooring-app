# Execution — Schema: pricing cleanup + send-unit snapshots + drop analytics

Layer: **Schema** (follow-up to `20260428205306_work_order_status_and_files`).
Branch: `staging` worktree (schema work belongs to staging Claude per `intent.md`).
Migration: `20260428220000_drop_item_pricing_analytics_add_send_unit_snapshots`.
Status: **Applied** to Railway (`shortline.proxy.rlwy.net:22153` — `railway/public`).

## TL;DR

| Change | Table | Notes |
|---|---|---|
| DROP `unitPrice` | `flooring_template_item` | column removed |
| ADD `sendUnitName TEXT NULL` | `flooring_template_item` | snapshot, mirrors `flooring_inventory.sendUnitName` |
| ADD `sendUnitAbbrev TEXT NULL` | `flooring_template_item` | snapshot, mirrors `flooring_inventory.sendUnitAbbrev` |
| DROP `unitPrice` | `flooring_work_order_item` | column removed |
| DROP `assignedQuantity` | `flooring_work_order_item` | column removed |
| DROP `assignedCost` | `flooring_work_order_item` | column removed |
| ADD `sendUnitName TEXT NULL` | `flooring_work_order_item` | snapshot |
| ADD `sendUnitAbbrev TEXT NULL` | `flooring_work_order_item` | snapshot |
| DROP TABLE | `flooring_analytics` | model removed; FK on WO cascade dropped first |
| DROP relation `analytics` | `FlooringWorkOrder` | back-ref removed from schema |

Field naming follows the existing inventory snapshot pattern (`sendUnitName` / `sendUnitAbbrev`) so domain/data layers can reuse the same shape.

## Files touched

- `packages/db/prisma/schema.prisma`
  - `FlooringTemplateItem`: removed `unitPrice`, added `sendUnitName String?` + `sendUnitAbbrev String?`.
  - `FlooringWorkOrderItem`: removed `unitPrice`, `assignedQuantity`, `assignedCost`; added `sendUnitName String?` + `sendUnitAbbrev String?`.
  - `FlooringWorkOrder`: removed `analytics FlooringAnalytics?` back-ref.
  - `FlooringAnalytics` model: removed entirely.
- `packages/db/prisma/migrations/20260428220000_drop_item_pricing_analytics_add_send_unit_snapshots/migration.sql` — created.

## Migration SQL (verbatim)

```sql
-- DropForeignKey
ALTER TABLE "flooring_analytics" DROP CONSTRAINT "flooring_analytics_workOrderId_fkey";

-- DropTable
DROP TABLE "flooring_analytics";

-- AlterTable
ALTER TABLE "flooring_template_item" DROP COLUMN "unitPrice",
ADD COLUMN     "sendUnitAbbrev" TEXT,
ADD COLUMN     "sendUnitName" TEXT;

-- AlterTable
ALTER TABLE "flooring_work_order_item" DROP COLUMN "unitPrice",
DROP COLUMN "assignedQuantity",
DROP COLUMN "assignedCost",
ADD COLUMN     "sendUnitAbbrev" TEXT,
ADD COLUMN     "sendUnitName" TEXT;
```

## Commands run

```
npm run db:deploy   # → prisma migrate deploy (DOTENV_CONFIG_PATH=../../.env)
npm run db:generate # → prisma generate (refresh client types)
```

`db:deploy` output confirmed: `Applying migration 20260428220000_drop_item_pricing_analytics_add_send_unit_snapshots` → `All migrations have been successfully applied.`

## Downstream impact (heals in later layers, not blocking)

Files known to reference dropped columns — these will produce TS errors on next typecheck and are owned by domain → data → application → API → modules sweeps as planned.

| Layer | File | Reference |
|---|---|---|
| Domain | `packages/domain/src/management/templates/material-items/{rules,normalizers,types}.ts` | `unitPrice` |
| Domain | `packages/domain/src/shared/line-totals.ts` | `unitPrice` |
| Data | `packages/db/src/management/templates/{read,write}-repository.ts` | `unitPrice` |
| Data | `packages/db/src/management/templates/material-items/{read,write}-repository.ts` | `unitPrice` |
| API | `apps/web/app/api/templates/_validators.ts` | `unitPrice` |
| Modules | `apps/web/modules/templates/components/record/template-material-items-section.tsx` | `unitPrice` |
| Modules | `apps/web/modules/templates/controllers/use-template-material-items-section.ts` | `unitPrice` |
| Modules | `apps/web/modules/work-orders/record/panel/{shared.ts,sections/work-order-material-items-section.tsx,controllers/use-work-order-material-section.ts}` | `unitPrice` (+ likely `assignedQuantity`/`assignedCost` in nearby code) |
| Modules (shared) | `apps/web/modules/shared/engines/record-view/...` | `unitPrice` (engine, will be migrated off in module sweep) |

`FlooringAnalytics`: confirmed **zero application/domain/data references** before the drop — only schema + historical migrations mentioned it. No downstream healing needed.

## Decisions made (recorded for the next layer)

1. **Field names** = `sendUnitName` (full name, e.g. "Square Feet") + `sendUnitAbbrev` (abbreviation, e.g. "sf"), nullable strings. Mirrors the existing `FlooringInventory` snapshot columns so normalizers can be shared. If you wanted different names (`sendUnit` / `sendUnitAbv`) say so and I'll rename.
2. **`unitPrice` columns dropped, not just hidden.** Earlier audit floated "stop selecting it from data layer but keep the column"; this sweep goes further and removes it. Domain/data/UI strip is no longer optional — it's required to compile.
3. **`assignedQuantity` / `assignedCost`** dropped from `FlooringWorkOrderItem`. Cut-assignment worker (deferred per intent) will need to live without them or reintroduce a different shape.
4. **`FlooringAnalytics`** dropped wholesale (model + table + FK). If aggregate totals are needed later they'll be derived on read, not persisted.

## Open follow-ups

- TS typecheck not run here — known to fail on out-of-scope `guard:prisma` violation (`packages/domain/src/flooring/imports/staged-inventory-rows/types.ts` direct `@prisma/client` import) plus the new errors from dropped columns. Captured intentionally for the domain sweep to address.
- No backfill of `sendUnitName` / `sendUnitAbbrev` for existing rows — they're nullable; populate on next write or in a later data-migration sweep if needed.
