-- Manufacturers are now deletable regardless of links; products fall back to
-- NULL instead of blocking the delete. Swap the product -> manufacturer FK from
-- ON DELETE RESTRICT to ON DELETE SET NULL (column is already nullable). Mirrors
-- the existing flooring_import_entry -> manufacturer SET NULL relation.

-- DropForeignKey
ALTER TABLE "flooring_product" DROP CONSTRAINT "flooring_product_manufacturerId_fkey";

-- AddForeignKey
ALTER TABLE "flooring_product" ADD CONSTRAINT "flooring_product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "flooring_manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
