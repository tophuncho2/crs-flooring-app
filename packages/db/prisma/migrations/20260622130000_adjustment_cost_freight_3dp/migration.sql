-- ============================================================================
-- FlooringInventoryAdjustment: widen `cost` and `freight` from DECIMAL(12, 2)
-- to DECIMAL(12, 3).
--
-- Why: adjustment cost/freight are NOT user input — they are derived pro-rata
-- from the parent inventory row (`parent × quantity / startingStock`). The 2dp
-- rounding on that computed share loses precision that accounting needs. The
-- domain normalizer (`normalizeAdjustmentMoneyAmount`, 3dp) now carries the
-- extra digit; this column change lets it persist.
--
-- Scope: adjustments ONLY. Inventory and staged-import money columns, and this
-- table's stock-quantity columns (before/quantity/after), stay DECIMAL(12, 2).
-- Widening scale is lossless — existing 2dp values gain a trailing zero.
-- ============================================================================

ALTER TABLE "flooring_inventory_adjustment"
  ALTER COLUMN "cost" SET DATA TYPE DECIMAL(12,3),
  ALTER COLUMN "freight" SET DATA TYPE DECIMAL(12,3);
