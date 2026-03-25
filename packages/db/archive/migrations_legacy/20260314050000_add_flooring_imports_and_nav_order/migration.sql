ALTER TABLE "User"
ADD COLUMN "flooringNavOrderSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "flooring_import_entry" (
  "id" TEXT NOT NULL,
  "importName" TEXT NOT NULL,
  "importType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "source" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "flooring_import_entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "flooring_import_entry_createdAt_idx" ON "flooring_import_entry"("createdAt");
