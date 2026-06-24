-- Rename the management-company concept to "entity" in place.
-- Pure rename: preserves all existing rows; no backfill, no new columns.
-- Model FlooringManagementCompany -> Entity, table flooring_management_company -> entity,
-- column name -> entity, and the Property (property_hub) FK column/index/constraint.

-- Master table + its display column + primary-key constraint.
ALTER TABLE "flooring_management_company" RENAME TO "entity";
ALTER TABLE "entity" RENAME COLUMN "name" TO "entity";
ALTER INDEX "flooring_management_company_pkey" RENAME TO "entity_pkey";

-- Property FK column, its index, and the foreign-key constraint.
ALTER TABLE "property_hub" RENAME COLUMN "managementCompanyId" TO "entityId";
ALTER INDEX "property_hub_managementCompanyId_idx" RENAME TO "property_hub_entityId_idx";
ALTER TABLE "property_hub" RENAME CONSTRAINT "property_hub_managementCompanyId_fkey" TO "property_hub_entityId_fkey";
