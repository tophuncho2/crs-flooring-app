-- Property: STORED generated integer derived from `property_number`.
--
-- Powers the record-view stepper + the exact property-number list search (btree
-- equality on the int). 'PROP-' is 5 chars, so the substring starts at FROM 6
-- (prefix length + 1) — the property analog of job-type's FROM 4 ('JT-').
-- ============================================================================

ALTER TABLE "property_hub"
  ADD COLUMN "propertyNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("property_number" FROM 6) AS INTEGER)) STORED;

CREATE INDEX "property_hub_propertyNumberInt_idx" ON "property_hub" ("propertyNumberInt");
