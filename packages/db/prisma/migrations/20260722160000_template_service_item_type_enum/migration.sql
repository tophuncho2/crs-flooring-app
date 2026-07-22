-- TemplateServiceItem.itemType: free-text VarChar(40) -> required ServiceItemType enum.
-- Existing dev rows are throwaway, so drop + re-add the column (no value preservation)
-- rather than an in-place ALTER ... USING cast. NOT NULL DEFAULT 'LABOR' so every row
-- (existing + new) is always classified.
CREATE TYPE "ServiceItemType" AS ENUM ('LABOR', 'MISCELLANEOUS');

ALTER TABLE "template_service_item" DROP COLUMN "itemType";
ALTER TABLE "template_service_item" ADD COLUMN "itemType" "ServiceItemType" NOT NULL DEFAULT 'LABOR';
