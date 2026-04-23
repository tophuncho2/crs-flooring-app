-- FlooringCutLog: per-cut cost + freight snapshots (frozen on create) and isWaste flag (editable).
-- Additive; no backfill.

ALTER TABLE "flooring_cut_log"
  ADD COLUMN "cost" DECIMAL(10,2),
  ADD COLUMN "freight" DECIMAL(10,2),
  ADD COLUMN "isWaste" BOOLEAN NOT NULL DEFAULT false;
