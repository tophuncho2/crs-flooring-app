ALTER TABLE "flooring_product"
  ADD COLUMN IF NOT EXISTS "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

INSERT INTO "flooring_category" ("id", "name", "createdAt")
SELECT '00000000-0000-0000-0000-000000000001', 'Uncategorized', NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM "flooring_category"
  WHERE "name" = 'Uncategorized'
);

UPDATE "flooring_product"
SET "categoryId" = (
  SELECT "id"
  FROM "flooring_category"
  WHERE "name" = 'Uncategorized'
  LIMIT 1
)
WHERE "categoryId" IS NULL;

ALTER TABLE "flooring_product"
  ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "flooring_product"
  DROP CONSTRAINT IF EXISTS "flooring_product_categoryId_fkey";

ALTER TABLE "flooring_product"
  ADD CONSTRAINT "flooring_product_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "flooring_category"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
