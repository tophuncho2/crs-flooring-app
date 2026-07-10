-- FlooringInventoryIndicator: new low-stock tracker table.
--
-- One indicator per (product, warehouse, unit) triple (see UNIQUE below) — a
-- product holds stock across many warehouses/UoMs, so the tracker must be a child
-- table. Carries a single `lowStockThreshold`; the colored status (OK / Low) is
-- DERIVED at READ time (live SUM(stockQuantity) for the triple vs the threshold),
-- never stored — a stock-relative status is not immutable, so not a valid GENERATED
-- column, and any stored value would be stale on the next adjustment. The future
-- notification worker reads the same derivation.
--
-- `indicator_number` mirrors INV-/STORE-/ADJ-: a sequence-backed 'IND-N' string,
-- unique + btree indexed, with a companion STORED generated `indicatorNumberInt`
-- (SUBSTRING FROM 5, 'IND-' = 4 chars) powering exact-# list search + the
-- record-view stepper.
--
-- product FK CASCADEs (indicator is a child of the product); warehouse + unit FKs
-- RESTRICT, matching the inventory convention. camelCase columns have NO @map, so
-- their real names are camelCase and MUST be double-quoted. updatedAt has no
-- default; Prisma stamps it via @updatedAt.
-- ============================================================================

-- CreateSequence
CREATE SEQUENCE flooring_inventory_indicator_number_seq START 1;

-- CreateTable
CREATE TABLE "flooring_inventory_indicator" (
    "id" TEXT NOT NULL,
    "indicator_number" TEXT NOT NULL DEFAULT ('IND-' || nextval('flooring_inventory_indicator_number_seq')::text),
    "indicatorNumberInt" INTEGER GENERATED ALWAYS AS (CAST(SUBSTRING("indicator_number" FROM 5) AS INTEGER)) STORED,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "lowStockThreshold" DECIMAL(12,2),
    "internalNotes" VARCHAR(250),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "flooring_inventory_indicator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flooring_inventory_indicator_indicator_number_key" ON "flooring_inventory_indicator"("indicator_number");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_inventory_indicator_productId_warehouseId_unitId_key" ON "flooring_inventory_indicator"("productId", "warehouseId", "unitId");

-- CreateIndex
CREATE INDEX "flooring_inventory_indicator_indicator_number_idx" ON "flooring_inventory_indicator"("indicator_number");

-- CreateIndex
CREATE INDEX "flooring_inventory_indicator_indicatorNumberInt_idx" ON "flooring_inventory_indicator"("indicatorNumberInt");

-- CreateIndex
CREATE INDEX "flooring_inventory_indicator_warehouseId_idx" ON "flooring_inventory_indicator"("warehouseId");

-- CreateIndex
CREATE INDEX "flooring_inventory_indicator_unitId_idx" ON "flooring_inventory_indicator"("unitId");

-- CreateIndex
CREATE INDEX "flooring_inventory_indicator_isActive_idx" ON "flooring_inventory_indicator"("isActive");

-- CreateIndex
CREATE INDEX "flooring_inventory_indicator_createdAt_id_idx" ON "flooring_inventory_indicator"("createdAt", "id");

-- CreateIndex
CREATE INDEX "flooring_inventory_indicator_updatedAt_id_idx" ON "flooring_inventory_indicator"("updatedAt", "id");

-- AddForeignKey
ALTER TABLE "flooring_inventory_indicator" ADD CONSTRAINT "flooring_inventory_indicator_productId_fkey" FOREIGN KEY ("productId") REFERENCES "flooring_product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory_indicator" ADD CONSTRAINT "flooring_inventory_indicator_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_inventory_indicator" ADD CONSTRAINT "flooring_inventory_indicator_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
