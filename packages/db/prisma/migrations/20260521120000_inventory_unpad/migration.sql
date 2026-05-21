-- ============================================================================
-- FlooringInventory: drop the zero-padding on inventoryNumber
--
-- Old default: 'INV-' || lpad(nextval('flooring_inventory_number_seq')::text, 5, '0')
--   → produced INV-00001, INV-00002, ...
-- New default: 'INV-' || nextval('flooring_inventory_number_seq')::text
--   → produces INV-1, INV-2, ...
--
-- Unlike the template + work-order unpad migrations, we do NOT restart the
-- sequence: demo seed data has already populated `flooring_inventory` with
-- padded rows (INV-0XXXX) on staging, and live main has three real users.
-- Letting the sequence continue from its current value means new rows insert
-- as INV-{N} (unpadded) without colliding with the existing padded ids.
-- The padded historical rows stay as-is; everything created from here forward
-- uses the new shape. The whole DB will be wiped before v1 ships, at which
-- point only the unpadded shape will exist.
--
-- This migration pairs with a sort change in the inventory read-repository
-- (primary sort is now productName ASC, createdAt ASC) so the loss of the
-- lexical-equals-numeric property of the padded format does not regress the
-- list view ordering.
-- ============================================================================

ALTER TABLE "flooring_inventory"
  ALTER COLUMN "inventory_number"
  SET DEFAULT ('INV-' || nextval('flooring_inventory_number_seq')::text);
