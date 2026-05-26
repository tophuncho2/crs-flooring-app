-- =====================================================================
-- Property name uniqueness (normalized)
--
-- Property names become unique case-/whitespace-insensitively, mirroring
-- the FlooringManufacturer pattern (display `name` kept; `nameNormalized`
-- = lower(btrim(name)) carries the UNIQUE constraint). Backfill-then-
-- constrain so the column can land NOT NULL on the populated table.
--
-- Pre-flight: CREATE UNIQUE INDEX fails if case-/whitespace-variant
-- duplicate property names already exist. Confirm staging is clean first:
--   SELECT lower(btrim(name)) AS n, count(*) FROM property_hub
--   GROUP BY 1 HAVING count(*) > 1;
-- Rename any duplicates before applying. Index name is within Postgres'
-- 63-char identifier limit and matches Prisma's {table}_{column}_key
-- convention (no follow-up rename migration).
-- =====================================================================

ALTER TABLE "property_hub" ADD COLUMN "nameNormalized" TEXT;

UPDATE "property_hub" SET "nameNormalized" = lower(btrim("name"));

ALTER TABLE "property_hub" ALTER COLUMN "nameNormalized" SET NOT NULL;

CREATE UNIQUE INDEX "property_hub_nameNormalized_key" ON "property_hub"("nameNormalized");
