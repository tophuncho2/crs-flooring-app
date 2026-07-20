-- =====================================================================
-- flooring_inventory.balanceLastChangedAt (TIMESTAMP(3), nullable)
--
-- Stamps WHEN a row's stock balance (netDeducted → derived stockQuantity) last
-- changed. Written ONLY by the adjustment-recompute
-- (`recomputeAndPersistNetDeducted`), which fires on every adjustment
-- create/edit/delete and on return-create — so it means specifically "stock
-- balance last changed", unlike `updatedAt` (which also bumps on location/note/
-- color edits). Additive-nullable ⇒ no backfill (null until the row's first
-- adjustment; a freshly created row's balance is its startingStock).
-- =====================================================================

-- AlterTable: flooring_inventory
ALTER TABLE "flooring_inventory" ADD COLUMN     "balanceLastChangedAt" TIMESTAMP(3);
