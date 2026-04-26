-- ============================================================================
-- FlooringCutLogStatus: add QUEUED for the worker pipeline
-- (Postgres ALTER TYPE ... ADD VALUE cannot run inside an explicit
--  transaction; Prisma's migration runner executes statements individually
--  so this works at the top level.)
-- ============================================================================

ALTER TYPE "FlooringCutLogStatus" ADD VALUE 'QUEUED';

-- ============================================================================
-- Sequences
-- ============================================================================

CREATE SEQUENCE flooring_cut_log_number_seq;

-- ============================================================================
-- FlooringCutLog: cutLogNumber, finalCutSequence, isFinal
-- ============================================================================

ALTER TABLE "flooring_cut_log"
  ADD COLUMN "cutLogNumber" TEXT NOT NULL
    DEFAULT ('CUT-' || lpad(nextval('flooring_cut_log_number_seq')::text, 7, '0')),
  ADD COLUMN "finalCutSequence" INTEGER,
  ADD COLUMN "isFinal" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "flooring_cut_log_cutLogNumber_key"
  ON "flooring_cut_log"("cutLogNumber");

CREATE INDEX "flooring_cut_log_cutLogNumber_idx"
  ON "flooring_cut_log"("cutLogNumber");

CREATE UNIQUE INDEX "flooring_cut_log_inventoryId_finalCutSequence_key"
  ON "flooring_cut_log"("inventoryId", "finalCutSequence");

-- ============================================================================
-- FlooringCutLog: selection / scan indexes (mirror staged-inv pattern)
-- ============================================================================

CREATE INDEX "flooring_cut_log_inventoryId_isFinal_idx"
  ON "flooring_cut_log"("inventoryId", "isFinal");

CREATE INDEX "flooring_cut_log_status_isFinal_idx"
  ON "flooring_cut_log"("status", "isFinal");
