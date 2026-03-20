BEGIN;

CREATE TABLE IF NOT EXISTS "flooring_section" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "flooring_section_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "flooring_section_warehouseId_name_key"
  ON "flooring_section"("warehouseId", "name");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flooring_section_warehouseId_fkey'
  ) THEN
    ALTER TABLE "flooring_section"
    ADD CONSTRAINT "flooring_section_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "flooring_warehouse"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "flooring_location"
ADD COLUMN IF NOT EXISTS "sectionId" TEXT;

CREATE INDEX IF NOT EXISTS "flooring_location_sectionId_idx"
  ON "flooring_location"("sectionId");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'flooring_section_registry'
  ) THEN
    INSERT INTO "flooring_section" ("id", "warehouseId", "name", "createdAt", "updatedAt")
    SELECT
      registry."id",
      registry."warehouseId",
      registry."name",
      registry."createdAt" AT TIME ZONE 'UTC',
      registry."createdAt" AT TIME ZONE 'UTC'
    FROM "flooring_section_registry" registry
    WHERE NOT EXISTS (
      SELECT 1
      FROM "flooring_section" existing
      WHERE existing."id" = registry."id"
    );

    UPDATE "flooring_location" location
    SET "sectionId" = registry."id"
    FROM "flooring_section_registry" registry
    WHERE location."sectionId" IS NULL
      AND location."warehouseId" = registry."warehouseId"
      AND location."section" = registry."name";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flooring_location_sectionId_fkey'
  ) THEN
    ALTER TABLE "flooring_location"
    ADD CONSTRAINT "flooring_location_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "flooring_section"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
