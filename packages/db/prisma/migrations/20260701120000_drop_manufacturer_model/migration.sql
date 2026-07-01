-- Drop the FlooringManufacturer model. Manufacturers were folded into the
-- Entity model (Entity Payments epic); backfill-manufacturers-to-entities has
-- mirrored every manufacturer link onto entityId and been verified in prod +
-- staging + dev, so the manufacturerId FK columns can be dropped without data
-- loss. Products and imports keep their entityId FK.

-- Drop the product -> manufacturer FK + index + column.
ALTER TABLE "flooring_product" DROP CONSTRAINT "flooring_product_manufacturerId_fkey";
DROP INDEX "flooring_product_manufacturerId_idx";
ALTER TABLE "flooring_product" DROP COLUMN "manufacturerId";

-- Drop the import-entry -> manufacturer FK + index + column.
ALTER TABLE "flooring_import_entry" DROP CONSTRAINT "flooring_import_entry_manufacturerId_fkey";
DROP INDEX "flooring_import_entry_manufacturerId_idx";
ALTER TABLE "flooring_import_entry" DROP COLUMN "manufacturerId";

-- Drop the now-orphaned manufacturer table (its pkey + unique + companyName
-- indexes drop with it).
DROP TABLE "flooring_manufacturer";
