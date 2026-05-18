-- Drop dimension columns from flooring_product.
-- References were removed across domain, data, application, api, and module layers in commit 3d21b710.
ALTER TABLE "flooring_product" DROP COLUMN "width";
ALTER TABLE "flooring_product" DROP COLUMN "sheetSize";
ALTER TABLE "flooring_product" DROP COLUMN "thickness";
ALTER TABLE "flooring_product" DROP COLUMN "unitWeight";
