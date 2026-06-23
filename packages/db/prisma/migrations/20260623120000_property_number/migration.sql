-- Property: install the canonical PROP- numbered-record column.
--
-- Mirrors job-type (JT-) / warehouse (STORE-) / inventory (INV-): a
-- sequence-backed `PREFIX-N` string column, unique + btree indexed. Clean
-- install — the sequence starts at 1 (no START clause), so existing property
-- rows auto-fill PROP-1, PROP-2 … in physical order via the column default (no
-- backfill, no renumber), and new properties continue from there. The companion
-- generated `propertyNumberInt` column lands in the follow-up migration.
-- ============================================================================

CREATE SEQUENCE property_hub_number_seq;

ALTER TABLE "property_hub"
  ADD COLUMN "property_number" TEXT NOT NULL
    DEFAULT ('PROP-' || nextval('property_hub_number_seq')::text);

CREATE UNIQUE INDEX "property_hub_property_number_key" ON "property_hub"("property_number");

CREATE INDEX "property_hub_property_number_idx" ON "property_hub"("property_number");
