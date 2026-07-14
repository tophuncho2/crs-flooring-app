-- Product gains its conversion formula FK (picked in the product form; seeded
-- onto inventory/adjustment/staged rows on product-select). Nullable, RESTRICT.

-- AlterTable
ALTER TABLE "flooring_product" ADD COLUMN     "conversionFormulaId" TEXT;

-- CreateIndex
CREATE INDEX "flooring_product_conversionFormulaId_idx" ON "flooring_product"("conversionFormulaId");

-- AddForeignKey
ALTER TABLE "flooring_product" ADD CONSTRAINT "flooring_product_conversionFormulaId_fkey" FOREIGN KEY ("conversionFormulaId") REFERENCES "flooring_conversion_formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
