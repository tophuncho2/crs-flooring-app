-- Drop the persisted free-text `notes` column from the template commission table.
-- Notes are fully retired from the commissions grid (the 3rd table in the templates
-- "products" section) — a commission line now carries only the entity link (sales
-- rep) + a manual percent. The line total (percent × Net Cost) is derived, unchanged.
ALTER TABLE "template_commission" DROP COLUMN "notes";
