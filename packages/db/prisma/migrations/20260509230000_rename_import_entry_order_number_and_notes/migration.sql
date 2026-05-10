ALTER TABLE "flooring_import_entry" RENAME COLUMN "orderNumber" TO "purchaseOrderNumber";
ALTER TABLE "flooring_import_entry" RENAME COLUMN "notes" TO "internalNotes";
UPDATE "flooring_import_entry" SET "internalNotes" = LEFT("internalNotes", 80) WHERE LENGTH("internalNotes") > 80;
ALTER TABLE "flooring_import_entry" ALTER COLUMN "internalNotes" TYPE VARCHAR(80);
