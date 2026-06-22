-- ============================================================================
-- FlooringWarehouse: drop the legacy `number` column.
--
-- Why: the app-assigned `number Int @unique` (computeNextNumber = max+1) does not
-- match the canonical numbered-record pattern (inventory/payments: a sequence-backed
-- `PREFIX-N` string + a stored generated int that powers the record-view stepper +
-- exact-number search). This is the clean RIP-OUT step — warehouses carry no record
-- number until the `STORE-` rebuild lands in the follow-up migration.
-- ============================================================================

ALTER TABLE "flooring_warehouse" DROP COLUMN "number";
