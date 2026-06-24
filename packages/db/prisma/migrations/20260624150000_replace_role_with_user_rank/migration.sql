-- Replace the legacy `Role` enum with the new `UserRank` tier hierarchy.
-- DEVELOPER sees/does everything; among tiers TIER_1 is highest, TIER_3 lowest.
-- Existing rows are mapped so seeded accounts keep their access on deploy:
--   ADMIN / BUILDER -> DEVELOPER, OWNER -> TIER_1, CONTRACTOR / CUSTOMER -> TIER_3.

-- CreateEnum
CREATE TYPE "UserRank" AS ENUM ('DEVELOPER', 'TIER_1', 'TIER_2', 'TIER_3');

-- AlterTable: add the new column nullable so we can backfill before enforcing NOT NULL
ALTER TABLE "User" ADD COLUMN "rank" "UserRank";

-- Backfill from the old role values
UPDATE "User" SET "rank" = CASE
  WHEN "role" IN ('ADMIN', 'BUILDER') THEN 'DEVELOPER'::"UserRank"
  WHEN "role" = 'OWNER' THEN 'TIER_1'::"UserRank"
  ELSE 'TIER_3'::"UserRank"
END;

-- Enforce default + NOT NULL now that every row has a value
ALTER TABLE "User" ALTER COLUMN "rank" SET DEFAULT 'TIER_3';
ALTER TABLE "User" ALTER COLUMN "rank" SET NOT NULL;

-- Drop the old column and enum
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "Role";
