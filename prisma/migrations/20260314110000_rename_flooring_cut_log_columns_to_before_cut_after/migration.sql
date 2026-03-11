ALTER TABLE "flooring_cut_log"
RENAME COLUMN "beforeCut" TO "before";

ALTER TABLE "flooring_cut_log"
RENAME COLUMN "quantityTaken" TO "cut";

ALTER TABLE "flooring_cut_log"
ADD COLUMN "after" DECIMAL(12, 2);

UPDATE "flooring_cut_log"
SET "after" = "before" - "cut";

ALTER TABLE "flooring_cut_log"
ALTER COLUMN "after" SET NOT NULL;
