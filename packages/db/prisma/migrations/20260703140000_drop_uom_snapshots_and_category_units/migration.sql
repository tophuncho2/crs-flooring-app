-- =====================================================================
-- UoM epic Phase-C — drop the dead snapshot columns + sever category<->unit.
--
-- The UoM FK migration (2A-2C) moved every unit onto a per-row `unitId` FK.
-- The old frozen snapshot strings (`sendUnit*` / `stockUnit*`) are fully
-- de-referenced — display now derives from the `unit` join on every model —
-- so they are dead weight and are dropped here. Category no longer owns a
-- unit (unit lives per-row), so its send/stock unit FKs are severed too.
--
-- Pure DROPs: no data migration, no backfill (the columns are already dead).
-- KEPT (Group C, deferred): flooring_category.slug + its unique, the
-- category/UoM `slug` columns, and Category/UoM CRUD.
-- =====================================================================

-- --- Group B: sever category <-> unit ---
-- Drop the category -> unit FKs, their indexes, then the columns.
ALTER TABLE "flooring_category" DROP CONSTRAINT "flooring_category_sendUnitId_fkey";
ALTER TABLE "flooring_category" DROP CONSTRAINT "flooring_category_stockUnitId_fkey";

DROP INDEX "flooring_category_sendUnitId_idx";
DROP INDEX "flooring_category_stockUnitId_idx";

ALTER TABLE "flooring_category" DROP COLUMN "sendUnitId",
DROP COLUMN "stockUnitId";

-- --- Group A: drop the 18 dead unit-snapshot value columns ---
ALTER TABLE "flooring_product" DROP COLUMN "sendUnitName",
DROP COLUMN "sendUnitAbbrev",
DROP COLUMN "stockUnitName",
DROP COLUMN "stockUnitAbbrev";

ALTER TABLE "flooring_inventory" DROP COLUMN "stockUnitName",
DROP COLUMN "stockUnitAbbrev",
DROP COLUMN "sendUnitName",
DROP COLUMN "sendUnitAbbrev";

ALTER TABLE "flooring_inventory_adjustment" DROP COLUMN "stockUnitName",
DROP COLUMN "stockUnitAbbrev";

ALTER TABLE "flooring_import_staged_inventory_row" DROP COLUMN "stockUnitName",
DROP COLUMN "stockUnitAbbrev";

ALTER TABLE "flooring_import_staged_inventory_filter_row" DROP COLUMN "stockUnitName",
DROP COLUMN "stockUnitAbbrev";

ALTER TABLE "flooring_template_item" DROP COLUMN "sendUnitName",
DROP COLUMN "sendUnitAbbrev";

ALTER TABLE "flooring_work_order_item" DROP COLUMN "sendUnitName",
DROP COLUMN "sendUnitAbbrev";
