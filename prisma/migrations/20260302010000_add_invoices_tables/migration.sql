-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "propertyContact" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobAddress" TEXT NOT NULL,
    "notes" TEXT,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "customerFileName" TEXT,
    "customerFileMime" TEXT,
    "customerFileData" BYTEA,
    "customerFileAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
