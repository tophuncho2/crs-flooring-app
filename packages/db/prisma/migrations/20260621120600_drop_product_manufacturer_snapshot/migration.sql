-- =====================================================================
-- Drop the denormalized `manufacturer` snapshot column on flooring_product.
--
-- The product carries the live manufacturer FK (`manufacturerId` +
-- `manufacturer` relation → flooring_manufacturer.companyName). The string
-- column `manufacturer` (Prisma `manufacturerName`) was only a historical
-- snapshot used as an orphan fallback when the FK was nulled
-- (`onDelete: SetNull`). That fallback is no longer wanted — a product with
-- no manufacturer link simply shows no manufacturer. Nothing filters, sorts,
-- searches, or validates on the column and it carries no index/constraint, so
-- it is removed outright. Reads now source the name from the relation only.
-- =====================================================================

-- DropColumn
ALTER TABLE "flooring_product" DROP COLUMN "manufacturer";
