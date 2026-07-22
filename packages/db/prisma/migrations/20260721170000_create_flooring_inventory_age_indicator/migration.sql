-- =====================================================================
-- Inventory Age Indicators: standalone user-managed lookup model.
--
-- Adds the `flooring_inventory_age_indicator` table — a user-editable set of
-- day thresholds, each with a palette color. An inventory row's Created /
-- Balance-Changed cell is colored by the LARGEST threshold whose `days` <= the
-- row's age in days (aged-past/floor bucketing), derived at read time.
--   • `days`   — INTEGER, UNIQUE (one color per threshold); the identity, the
--     locked ASC sort key, and the record-view stepper-neighbor key.
--   • `color`  — non-semantic palette tag (shared PaletteColor enum).
--   • `createdBy`/`updatedBy` — actor-email columns (nullable, no FK).
--
-- Stands ALONE — no foreign keys, no sequence/generated number (unlike the
-- ROW-/ET- lookups; `days` is the natural identity). The shared "PaletteColor"
-- enum already exists, so no CREATE TYPE here.
-- =====================================================================

-- CreateTable
CREATE TABLE "flooring_inventory_age_indicator" (
    "id" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "color" "PaletteColor" NOT NULL DEFAULT 'SLATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "flooring_inventory_age_indicator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (UNIQUE — one color per day threshold)
CREATE UNIQUE INDEX "flooring_inventory_age_indicator_days_key" ON "flooring_inventory_age_indicator"("days");

-- CreateIndex (btree — powers the locked ASC list order + stepper neighbors)
CREATE INDEX "flooring_inventory_age_indicator_days_idx" ON "flooring_inventory_age_indicator"("days");
