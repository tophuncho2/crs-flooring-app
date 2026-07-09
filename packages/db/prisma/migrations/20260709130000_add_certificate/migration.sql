-- =====================================================================
-- Certificate: new compliance-certificate tracking table.
--
-- A certificate (insurance / license / compliance doc) belongs to at most one
-- Entity (nullable FK, SET NULL on delete — a deleted entity orphans its
-- certificates rather than cascade-deleting them; certificates outlive the link).
--
-- expirationDate is a calendar Date (no time). The Expired / Expiring Soon /
-- Valid / No Expiration status is derived at READ time in the domain, never
-- stored (a CURRENT_DATE - expirationDate diff is not immutable → not a valid
-- GENERATED column, and any stored value would be stale the next day).
--
-- NOTE: `certificate` columns have NO @map, so their real names are camelCase and
-- MUST be double-quoted — an unquoted identifier folds to lowercase. updatedAt
-- has no default; Prisma stamps it via @updatedAt.
-- =====================================================================

-- CreateTable
CREATE TABLE "certificate" (
    "id" TEXT NOT NULL,
    "entityId" TEXT,
    "name" VARCHAR(120) NOT NULL,
    "expirationDate" DATE,
    "internalNotes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificate_entityId_idx" ON "certificate"("entityId");

-- CreateIndex
CREATE INDEX "certificate_expirationDate_idx" ON "certificate"("expirationDate");

-- CreateIndex
CREATE INDEX "certificate_name_idx" ON "certificate"("name");

-- CreateIndex
CREATE INDEX "certificate_createdAt_id_idx" ON "certificate"("createdAt", "id");

-- CreateIndex
CREATE INDEX "certificate_updatedAt_id_idx" ON "certificate"("updatedAt", "id");

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
