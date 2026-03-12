-- Flooring manufacturers linked from products
CREATE TABLE IF NOT EXISTS "flooring_manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_manufacturer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "flooring_manufacturer_name_key" ON "flooring_manufacturer"("name");

ALTER TABLE "flooring_product" ADD COLUMN IF NOT EXISTS "manufacturerId" TEXT;
ALTER TABLE "flooring_product"
    ADD CONSTRAINT "flooring_product_manufacturerId_fkey"
    FOREIGN KEY ("manufacturerId") REFERENCES "flooring_manufacturer" ("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Inventory line items for stock tracking by location
CREATE TABLE IF NOT EXISTS "flooring_inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "dyeLot" INTEGER NOT NULL,
    "locationId" TEXT NOT NULL,
    "stockCount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_inventory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "flooring_inventory_productId_idx" ON "flooring_inventory"("productId");
CREATE INDEX IF NOT EXISTS "flooring_inventory_locationId_idx" ON "flooring_inventory"("locationId");
CREATE UNIQUE INDEX IF NOT EXISTS "flooring_inventory_locationId_itemNumber_key" ON "flooring_inventory"("locationId", "itemNumber");

ALTER TABLE "flooring_inventory"
    ADD CONSTRAINT "flooring_inventory_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "flooring_product" ("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "flooring_inventory"
    ADD CONSTRAINT "flooring_inventory_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "flooring_location" ("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Cut log entries to track what was taken from each roll
CREATE TABLE IF NOT EXISTS "flooring_cut_log" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "workOrderItemId" TEXT,
    "quantityTaken" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_cut_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "flooring_cut_log_inventoryId_idx" ON "flooring_cut_log"("inventoryId");
CREATE INDEX IF NOT EXISTS "flooring_cut_log_workOrderId_idx" ON "flooring_cut_log"("workOrderId");
CREATE INDEX IF NOT EXISTS "flooring_cut_log_workOrderItemId_idx" ON "flooring_cut_log"("workOrderItemId");

ALTER TABLE "flooring_cut_log"
    ADD CONSTRAINT "flooring_cut_log_inventoryId_fkey"
    FOREIGN KEY ("inventoryId") REFERENCES "flooring_inventory" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "flooring_cut_log"
    ADD CONSTRAINT "flooring_cut_log_workOrderId_fkey"
    FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order" ("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "flooring_cut_log"
    ADD CONSTRAINT "flooring_cut_log_workOrderItemId_fkey"
    FOREIGN KEY ("workOrderItemId") REFERENCES "flooring_work_order_item" ("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
