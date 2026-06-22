-- FlooringJobType: STORED generated integer derived from `job_type_number`.
--
-- Powers the record-view stepper + the exact job-number list search (btree
-- equality on the int). 'JT-' is 3 chars, so the substring starts at FROM 4
-- (prefix length + 1) — the job-type analog of warehouse's FROM 7 ('STORE-').
-- ============================================================================

ALTER TABLE "flooring_job_type"
  ADD COLUMN "jobTypeNumberInt" INTEGER
  GENERATED ALWAYS AS (CAST(SUBSTRING("job_type_number" FROM 4) AS INTEGER)) STORED;

CREATE INDEX "flooring_job_type_jobTypeNumberInt_idx" ON "flooring_job_type" ("jobTypeNumberInt");
