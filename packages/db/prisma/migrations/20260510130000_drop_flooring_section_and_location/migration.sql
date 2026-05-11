-- =====================================================================
-- Drop FlooringSection and FlooringLocation models.
--
-- Inbound FKs were already removed in earlier migrations:
--   - flooring_inventory.locationId      → 20260510120000_inventory_and_cut_log_field_reshape
--   - flooring_import_staged_inventory_row.locationId → 20260509240000_staged_inventory_field_reshape
-- The only remaining FK is flooring_location.sectionId → flooring_section.
-- Drop flooring_location first (child), then flooring_section (parent).
-- =====================================================================

DROP TABLE "flooring_location";
DROP TABLE "flooring_section";
