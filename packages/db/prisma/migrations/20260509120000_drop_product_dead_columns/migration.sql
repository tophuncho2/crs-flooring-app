-- Drop unused columns from flooring_product.
-- These fields were never wired up to any layer (domain, data, application, api, ui, tests).
ALTER TABLE "flooring_product" DROP COLUMN "cost";
ALTER TABLE "flooring_product" DROP COLUMN "isPublic";
ALTER TABLE "flooring_product" DROP COLUMN "subOrder";
