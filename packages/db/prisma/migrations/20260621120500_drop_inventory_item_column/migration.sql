-- =====================================================================
-- Drop the denormalized `inventoryItem` display column.
--
-- `inventoryItem` was a composed blob (`inventoryNumber · roll · dyeLot ·
-- note`) on both `flooring_inventory` and `flooring_inventory_adjustment`.
-- Each component now has its own column + its own per-field search bar, so
-- nothing filters/sorts/searches on the combined string and its trigram GIN
-- index on the adjustments table is unused. The column + index are removed
-- across both tables; the per-field identity trgm indexes stay.
-- =====================================================================

-- DropIndex (dead inventoryItem substring-search GIN)
DROP INDEX IF EXISTS "flooring_inventory_adjustment_inventoryItem_trgm_idx";

-- DropColumn
ALTER TABLE "flooring_inventory" DROP COLUMN "inventoryItem";
ALTER TABLE "flooring_inventory_adjustment" DROP COLUMN "inventoryItem";
