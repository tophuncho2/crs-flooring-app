-- Retire template invoice items: the §3 toggle collapses to Planned Payments only.
-- Dropping the table also drops its FK (template_invoice_item_templateId_fkey) and
-- both @@index rows with it.
DROP TABLE "template_invoice_item";
