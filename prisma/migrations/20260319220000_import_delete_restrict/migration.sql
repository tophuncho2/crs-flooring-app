ALTER TABLE "flooring_inventory"
DROP CONSTRAINT IF EXISTS "flooring_inventory_importEntryId_fkey";

ALTER TABLE "flooring_inventory"
ADD CONSTRAINT "flooring_inventory_importEntryId_fkey"
FOREIGN KEY ("importEntryId")
REFERENCES "flooring_import_entry"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
