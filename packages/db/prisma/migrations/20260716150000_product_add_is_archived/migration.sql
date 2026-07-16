-- Archive flag on products (mirrors flooring_inventory.isArchived).
ALTER TABLE "flooring_product" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- Backs the default-hide list filter + the picker-options exclusion.
CREATE INDEX "flooring_product_isArchived_idx" ON "flooring_product"("isArchived");
