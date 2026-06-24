-- Make Stock Ordered optional on import staged-inventory filter rows.
-- A filter row may now exist before the ordered quantity is known.
ALTER TABLE "flooring_import_staged_inventory_filter_row"
  ALTER COLUMN "stockOrdered" DROP NOT NULL;
