-- =====================================================================
-- Introduce FlooringImportStagedInventoryFilterRow as the parent row
-- above FlooringImportStagedInventoryRow.
--
-- Each filter row holds (importEntry, optional categoryFilter, product,
-- stockOrdered). Per import, no two filter rows may share the same
-- product (enforced by @@unique([importEntryId, productId])).
--
-- Stock unit name / abbrev are snapshotted from FlooringProduct at
-- filter-row create time (same shape WOMI uses for sendUnitName /
-- sendUnitAbbrev). Staged inv rows then snapshot those two columns
-- from the filter row at create time, so the materialize worker reads
-- them directly off the staged row.
--
-- FlooringImportStagedInventoryRow gains a required filterRowId FK
-- (RESTRICT) linking each staged row to its parent filter row. The
-- existing productId column is preserved as a create-time snapshot so
-- the materialize worker continues to read productId off the staged row
-- without joining through the filter.
--
-- All existing staged inventory rows have been cleared, so filterRowId
-- is added as NOT NULL with no backfill needed.
-- =====================================================================

-- CreateTable
CREATE TABLE "flooring_import_staged_inventory_filter_row" (
    "id" TEXT NOT NULL,
    "importEntryId" TEXT NOT NULL,
    "categoryFilterId" TEXT,
    "productId" TEXT NOT NULL,
    "stockOrdered" DECIMAL(12,2) NOT NULL,
    "stockUnitName" TEXT,
    "stockUnitAbbrev" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_import_staged_inventory_filter_row_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flooring_import_staged_inventory_filter_row_importEntryId_productId_key" ON "flooring_import_staged_inventory_filter_row"("importEntryId", "productId");

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_filter_row_importEntryId_idx" ON "flooring_import_staged_inventory_filter_row"("importEntryId");

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_filter_row_productId_idx" ON "flooring_import_staged_inventory_filter_row"("productId");

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_filter_row_categoryFilterId_idx" ON "flooring_import_staged_inventory_filter_row"("categoryFilterId");

-- AddForeignKey
ALTER TABLE "flooring_import_staged_inventory_filter_row" ADD CONSTRAINT "flooring_import_staged_inventory_filter_row_importEntryId_fkey" FOREIGN KEY ("importEntryId") REFERENCES "flooring_import_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_staged_inventory_filter_row" ADD CONSTRAINT "flooring_import_staged_inventory_filter_row_categoryFilterId_fkey" FOREIGN KEY ("categoryFilterId") REFERENCES "flooring_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_import_staged_inventory_filter_row" ADD CONSTRAINT "flooring_import_staged_inventory_filter_row_productId_fkey" FOREIGN KEY ("productId") REFERENCES "flooring_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: link staged inv rows to filter rows + add stock-unit snapshot columns
ALTER TABLE "flooring_import_staged_inventory_row" ADD COLUMN "filterRowId" TEXT NOT NULL;
ALTER TABLE "flooring_import_staged_inventory_row" ADD COLUMN "stockUnitName" TEXT;
ALTER TABLE "flooring_import_staged_inventory_row" ADD COLUMN "stockUnitAbbrev" TEXT;

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_row_filterRowId_idx" ON "flooring_import_staged_inventory_row"("filterRowId");

-- CreateIndex
CREATE INDEX "flooring_import_staged_inventory_row_filterRowId_status_idx" ON "flooring_import_staged_inventory_row"("filterRowId", "status");

-- AddForeignKey
ALTER TABLE "flooring_import_staged_inventory_row" ADD CONSTRAINT "flooring_import_staged_inventory_row_filterRowId_fkey" FOREIGN KEY ("filterRowId") REFERENCES "flooring_import_staged_inventory_filter_row"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
