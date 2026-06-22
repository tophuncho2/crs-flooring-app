-- =====================================================================
-- Payments: keep the ledger lean.
--
-- Drops three optional free-form columns from `flooring_payment`:
-- `paymentType`, `paymentMethod`, and `memo`. They carried no business
-- rules (nullable, unvalidated, never filtered) and are being removed
-- all the way through the stack. `paymentDate` is intentionally kept.
-- =====================================================================

-- DropColumn
ALTER TABLE "flooring_payment"
    DROP COLUMN "paymentType",
    DROP COLUMN "paymentMethod",
    DROP COLUMN "memo";
