-- =====================================================================
-- Link each inventory row back to the staged row it was materialized from.
--
-- The worker already computes this correlation in memory
-- (materializeImportedStagedRowsUseCase → sourceStagedRowId) but never
-- persisted it. Persisting it lets deleteInventoryUseCase delete the
-- originating staged row in the same transaction.
--
-- Column is NULLABLE and UNIQUE (1:1 — each staged row materializes to at
-- most one inventory row; nullable allows many NULLs for manual creates and
-- pre-migration rows). FK is ON DELETE SET NULL: the forward cascade
-- (inventory delete → staged delete) is done explicitly in the use case;
-- this action only governs the reverse edge so a staged-row deletion never
-- destroys an inventory row.
--
-- Purely additive + forward-only: pre-migration inventory rows keep a NULL
-- link (no reliable backfill exists — the link was never stored). Safe to
-- apply ahead of the code that reads the column (expand pattern).
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_inventory" ADD COLUMN "sourceStagedRowId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "flooring_inventory_sourceStagedRowId_key" ON "flooring_inventory"("sourceStagedRowId");

-- AddForeignKey
ALTER TABLE "flooring_inventory" ADD CONSTRAINT "flooring_inventory_sourceStagedRowId_fkey" FOREIGN KEY ("sourceStagedRowId") REFERENCES "flooring_import_staged_inventory_row"("id") ON DELETE SET NULL ON UPDATE CASCADE;
