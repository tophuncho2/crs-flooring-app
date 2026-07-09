-- =====================================================================
-- Drop template_planned_payment.paymentDate: the planned-payments §3 grid
-- no longer captures a Date. The field was added in the PASS-1 create
-- migration (20260704120000); it is retired wholesale — no data depends on
-- it and nothing projects it anymore. A forward DROP is correct whether or
-- not later planned-payments migrations have been applied on a given DB.
-- =====================================================================

-- DropColumn
ALTER TABLE "template_planned_payment" DROP COLUMN "paymentDate";
