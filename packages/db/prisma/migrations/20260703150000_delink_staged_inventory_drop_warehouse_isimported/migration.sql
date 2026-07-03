-- =====================================================================
-- Sever staged<->inventory linkage + drop staged warehouseId / isImported.
--
-- (1) Sever the inventory -> staged FK (`sourceStagedRowId`). A materialized
--     inventory row no longer points back at the staged row it came from; the
--     staged row is pure history. The QUEUED->IMPORTED status flip still runs
--     off an in-memory id correlation array, independent of this FK.
-- (2) Drop the staged row's own `warehouseId` snapshot. Warehouse now sources
--     from the parent import (`flooring_import_entry.warehouseId`, non-null and
--     frozen-while-children-exist) on every read + at materialize.
-- (3) Drop the dead `isImported` latch (superseded by `status`).
--
-- Pure DROPs: no data migration, no backfill (nothing reads these forward).
-- =====================================================================

-- (1) inventory -> staged FK
ALTER TABLE "flooring_inventory" DROP CONSTRAINT "flooring_inventory_sourceStagedRowId_fkey";
DROP INDEX "flooring_inventory_sourceStagedRowId_key";
ALTER TABLE "flooring_inventory" DROP COLUMN "sourceStagedRowId";

-- (2) staged row warehouseId
ALTER TABLE "flooring_import_staged_inventory_row" DROP CONSTRAINT "flooring_import_staged_inventory_row_warehouseId_fkey";
DROP INDEX "flooring_import_staged_inventory_row_warehouseId_idx";
ALTER TABLE "flooring_import_staged_inventory_row" DROP COLUMN "warehouseId";

-- (3) staged row isImported (keep the importEntryId+status index that carries the load)
DROP INDEX "flooring_import_staged_inventory_row_importEntryId_isImport_idx";
DROP INDEX "flooring_import_staged_inventory_row_status_isImported_idx";
ALTER TABLE "flooring_import_staged_inventory_row" DROP COLUMN "isImported";
