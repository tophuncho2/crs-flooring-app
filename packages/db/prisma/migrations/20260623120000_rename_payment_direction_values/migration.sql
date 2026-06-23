-- Rename payment direction enum values in place: INFLOW -> REVENUE, OUTFLOW -> EXPENSE.
-- Rename preserves existing FlooringPayment rows (no drop/recreate of the type).
-- Semantics unchanged: REVENUE = money in (positive), EXPENSE = money out (negative).
ALTER TYPE "FlooringPaymentDirection" RENAME VALUE 'INFLOW' TO 'REVENUE';
ALTER TYPE "FlooringPaymentDirection" RENAME VALUE 'OUTFLOW' TO 'EXPENSE';
