-- CreateTable
CREATE TABLE "flooring_template_sales_rep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_template_sales_rep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flooring_template_sales_rep_templateId_contactId_key" ON "flooring_template_sales_rep"("templateId", "contactId");

-- CreateIndex
CREATE INDEX "flooring_template_sales_rep_templateId_idx" ON "flooring_template_sales_rep"("templateId");

-- CreateIndex
CREATE INDEX "flooring_template_sales_rep_contactId_idx" ON "flooring_template_sales_rep"("contactId");

-- CreateIndex
CREATE INDEX "flooring_template_sales_rep_templateId_createdAt_idx" ON "flooring_template_sales_rep"("templateId", "createdAt");

-- AddForeignKey
ALTER TABLE "flooring_template_sales_rep" ADD CONSTRAINT "flooring_template_sales_rep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "flooring_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_template_sales_rep" ADD CONSTRAINT "flooring_template_sales_rep_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "flooring_contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
