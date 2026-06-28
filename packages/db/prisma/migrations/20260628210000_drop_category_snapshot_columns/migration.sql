-- Drop the redundant product-category snapshot columns. The product's category
-- is already baked into the stored product name, and the product→category link
-- is locked while inventory exists, so these snapshots are pure dead weight.
-- `categorySlug` was plumbing for a removed "conversion" feature.
ALTER TABLE "flooring_inventory" DROP COLUMN "categorySlug",
                                 DROP COLUMN "categoryName";

ALTER TABLE "flooring_inventory_adjustment" DROP COLUMN "categorySlug";
