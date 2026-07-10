-- Add free-text internal notes to payments (nullable, no backfill, no index).
ALTER TABLE "flooring_payment" ADD COLUMN "internalNotes" VARCHAR(250);
