-- FlooringJobType: install the canonical JT- numbered-record column.
--
-- Mirrors warehouse (STORE-) / inventory (INV-) / payments (PAY-): a
-- sequence-backed `PREFIX-N` string column, unique + btree indexed. Clean
-- install — the sequence starts at 1 (no START clause), so existing job-type
-- rows auto-fill JT-1, JT-2 … in physical order via the column default (no
-- backfill, no renumber), and new job types continue from there. The companion
-- generated `jobTypeNumberInt` column lands in the follow-up migration.
-- ============================================================================

CREATE SEQUENCE flooring_job_type_number_seq;

ALTER TABLE "flooring_job_type"
  ADD COLUMN "job_type_number" TEXT NOT NULL
    DEFAULT ('JT-' || nextval('flooring_job_type_number_seq')::text);

CREATE UNIQUE INDEX "flooring_job_type_job_type_number_key" ON "flooring_job_type"("job_type_number");

CREATE INDEX "flooring_job_type_job_type_number_idx" ON "flooring_job_type"("job_type_number");
