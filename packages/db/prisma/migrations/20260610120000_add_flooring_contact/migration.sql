-- =====================================================================
-- Contacts: standalone master-data entity.
--
-- Adds the `flooring_contact` table (name + optional phone/email). Names
-- are NOT unique — contacts are people, so duplicates are allowed; the
-- name index backs the list-view search only. No relations to other
-- tables (a second model will reference contacts in a later migration).
-- =====================================================================

-- CreateTable
CREATE TABLE "flooring_contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flooring_contact_name_idx" ON "flooring_contact"("name");
