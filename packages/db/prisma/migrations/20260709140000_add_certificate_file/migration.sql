-- =====================================================================
-- CertificateFile: files attached to a certificate (COI PDF, endorsements,
-- scans, photos). The row is the durable record; `objectKey` points at the
-- object in the private S3 bucket.
--
-- ON DELETE CASCADE removes the ROWS when a certificate is deleted; the S3
-- OBJECTS are cleaned up separately by `deleteCertificateUseCase` (a FK cascade
-- cannot reach the bucket). `objectKey` is UNIQUE so a key can never be reused.
--
-- NOTE: `certificate_file` columns have NO @map, so their real names are
-- camelCase and MUST be double-quoted — an unquoted identifier folds to
-- lowercase.
-- =====================================================================

-- CreateTable
CREATE TABLE "certificate_file" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "certificate_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_file_objectKey_key" ON "certificate_file"("objectKey");

-- CreateIndex
CREATE INDEX "certificate_file_certificateId_idx" ON "certificate_file"("certificateId");

-- AddForeignKey
ALTER TABLE "certificate_file" ADD CONSTRAINT "certificate_file_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
