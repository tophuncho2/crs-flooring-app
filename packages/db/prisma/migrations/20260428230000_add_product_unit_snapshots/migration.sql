-- AlterTable
ALTER TABLE "flooring_product"
  ADD COLUMN "sendUnitName"           TEXT,
  ADD COLUMN "sendUnitAbbrev"         TEXT,
  ADD COLUMN "stockUnitName"          TEXT,
  ADD COLUMN "stockUnitAbbrev"        TEXT,
  ADD COLUMN "itemCoverageUnitName"   TEXT,
  ADD COLUMN "itemCoverageUnitAbbrev" TEXT;
