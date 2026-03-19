ALTER TABLE "flooring_product" DROP CONSTRAINT IF EXISTS "flooring_product_manufacturerId_fkey";

ALTER TABLE "flooring_product"
ADD CONSTRAINT "flooring_product_manufacturerId_fkey"
FOREIGN KEY ("manufacturerId")
REFERENCES "flooring_manufacturer"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
