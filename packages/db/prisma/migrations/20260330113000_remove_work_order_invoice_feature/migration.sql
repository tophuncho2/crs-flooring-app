DELETE FROM "queue_outbox_event"
WHERE "topic" = 'invoice.generation.requested.v1'
   OR "aggregateType" = 'flooringInvoiceGeneration';

DROP TABLE IF EXISTS "flooring_invoice_artifact";
DROP TABLE IF EXISTS "flooring_invoice_generation";

ALTER TABLE "flooring_work_order"
DROP COLUMN IF EXISTS "invoiceSourceVersion";

DROP TYPE IF EXISTS "FlooringInvoiceGenerationStatus";
