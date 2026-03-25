DELETE FROM "UserToolAccess"
WHERE "toolId" IN (
  SELECT "id"
  FROM "Tool"
  WHERE "slug" IN ('estimator', 'invoices', 'jobs', 'daily-scope')
);

DELETE FROM "Tool"
WHERE "slug" IN ('estimator', 'invoices', 'jobs', 'daily-scope');

DROP TABLE IF EXISTS "JobExpense" CASCADE;
DROP TABLE IF EXISTS "JobPendingLaborPayment" CASCADE;
DROP TABLE IF EXISTS "JobAssignee" CASCADE;
DROP TABLE IF EXISTS "DailyScopeItem" CASCADE;
DROP TABLE IF EXISTS "DailyScope" CASCADE;
DROP TABLE IF EXISTS "EstimateItem" CASCADE;
DROP TABLE IF EXISTS "Estimate" CASCADE;
DROP TABLE IF EXISTS "InvoiceItem" CASCADE;
DROP TABLE IF EXISTS "Invoice" CASCADE;
DROP TABLE IF EXISTS "Job" CASCADE;

DROP TYPE IF EXISTS "JobExpenseType";
DROP TYPE IF EXISTS "PendingLaborPaymentStatus";
