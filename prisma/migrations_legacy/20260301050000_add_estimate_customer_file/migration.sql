ALTER TABLE "Estimate"
ADD COLUMN "customerFileName" TEXT,
ADD COLUMN "customerFileMime" TEXT,
ADD COLUMN "customerFileData" BYTEA,
ADD COLUMN "customerFileAt" TIMESTAMP(3);
