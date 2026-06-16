-- ============================================================================
-- Drop the now-unused GIN trigram indexes on the work-order / inventory NUMBER
-- columns.
--
-- Why: the # search bars (work-order number, inventory number) were switched
-- from a case-insensitive substring match (ILIKE `%n%`, which these trigram
-- indexes backed) to an EXACT match on the generated integer columns
-- `workOrderNumberInt` / `inventoryNumberInt` (their own btree indexes). After
-- that switch nothing ILIKEs `work_order_number` / `inventory_number` anymore:
--   - work_order_number: only consumer was the list-view # bar.
--   - inventory_number: both the list-view # bar and the merge-candidate picker,
--     both now exact-int.
-- So these trigram indexes are dead weight on every insert/update with no read
-- left to serve.
--
-- NOTE: only the NUMBER-column trigram indexes are dropped. The other identity
-- search bars stay substring ILIKE and keep their trigram indexes:
--   work order: unitType / unitNumber / description
--   inventory:  rollNumber / dyeLot / note / location
-- The adjustments inventory-number search bar is unchanged (separate snapshot
-- column on a separate table) and is unaffected by these drops.
-- ============================================================================

DROP INDEX IF EXISTS "flooring_work_order_work_order_number_trgm_idx";

DROP INDEX IF EXISTS "flooring_inventory_inventory_number_trgm_idx";
