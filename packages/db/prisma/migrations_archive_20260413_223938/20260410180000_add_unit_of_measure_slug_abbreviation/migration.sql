-- AlterTable: add nullable columns
ALTER TABLE "flooring_unit_of_measure" ADD COLUMN "slug" TEXT;
ALTER TABLE "flooring_unit_of_measure" ADD COLUMN "abbreviation" TEXT;

-- Backfill existing rows
UPDATE "flooring_unit_of_measure" SET "slug" = lower(replace("name", ' ', '-')), "abbreviation" = "name" WHERE "slug" IS NULL;

-- Set NOT NULL
ALTER TABLE "flooring_unit_of_measure" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "flooring_unit_of_measure" ALTER COLUMN "abbreviation" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "flooring_unit_of_measure_slug_key" ON "flooring_unit_of_measure"("slug");
