-- Entity: STORED generated integer derived from `entity_number`.
--
-- Powers the record-view stepper + the exact entity-number list search (btree
-- equality on the int). 'ENT-' is 4 chars, so the substring starts at FROM 5
-- (prefix length + 1) — the entity analog of inventory's FROM 5 ('INV-').
-- ============================================================================

ALTER TABLE "entity"
  ADD COLUMN "entityNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("entity_number" FROM 5) AS INTEGER)) STORED;

CREATE INDEX "entity_entityNumberInt_idx" ON "entity" ("entityNumberInt");
