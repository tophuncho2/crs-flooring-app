-- Drop the vestigial category-filter FK on staged-inventory filter rows.
-- The category is a client-side product-narrowing filter only; the row's
-- productId already determines the category, so this column stored nothing
-- not derivable from the product. Pure drop: constraint -> index -> column.

-- DropForeignKey
ALTER TABLE "flooring_import_staged_inventory_filter_row"
  DROP CONSTRAINT "flooring_import_staged_inventory_filter_row_categoryFilter_fkey";

-- DropIndex
DROP INDEX "flooring_import_staged_inventory_filter_row_categoryFilterI_idx";

-- DropColumn
ALTER TABLE "flooring_import_staged_inventory_filter_row"
  DROP COLUMN "categoryFilterId";
