ALTER TABLE "flooring_product" RENAME COLUMN "notes" TO "note";
UPDATE "flooring_product" SET "note" = LEFT("note", 80) WHERE LENGTH("note") > 80;
ALTER TABLE "flooring_product" ALTER COLUMN "note" TYPE VARCHAR(80);
