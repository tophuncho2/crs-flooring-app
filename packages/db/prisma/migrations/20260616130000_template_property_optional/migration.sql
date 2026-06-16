-- =====================================================================
-- Make a template's property optional.
--
-- A template is stubbed out before a property is chosen; the
-- auto-generated template_number means a row is never truly empty, so
-- propertyId no longer needs to be NOT NULL. Unit type stays required.
-- Existing rows keep their values. The FK + onDelete RESTRICT are
-- unchanged — only nullability drops, so no constraint is recreated.
-- =====================================================================

-- AlterTable
ALTER TABLE "flooring_template" ALTER COLUMN "propertyId" DROP NOT NULL;
