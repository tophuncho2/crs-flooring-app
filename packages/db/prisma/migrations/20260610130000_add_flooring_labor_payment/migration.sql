-- =====================================================================
-- Labor Payments: payments owed/made to a contact (labor).
--
-- Adds the `flooring_labor_payment` table. Each row links to exactly one
-- `flooring_contact` (required FK, ON DELETE RESTRICT so a contact with
-- payments cannot be deleted). `unit` (room/area), `description`, and
-- `cost` are all optional. The contactId index backs the list-view search,
-- which filters on the related contact's name.
-- =====================================================================

-- CreateTable
CREATE TABLE "flooring_labor_payment" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "cost" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_labor_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flooring_labor_payment_contactId_idx" ON "flooring_labor_payment"("contactId");

-- AddForeignKey
ALTER TABLE "flooring_labor_payment" ADD CONSTRAINT "flooring_labor_payment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "flooring_contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
