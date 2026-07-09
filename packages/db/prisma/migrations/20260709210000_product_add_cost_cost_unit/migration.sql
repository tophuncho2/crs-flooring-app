-- AlterTable
ALTER TABLE "flooring_product" ADD COLUMN     "cost" DECIMAL(12,2),
ADD COLUMN     "costUnitId" TEXT;

-- CreateIndex
CREATE INDEX "flooring_product_costUnitId_idx" ON "flooring_product"("costUnitId");

-- AddForeignKey
ALTER TABLE "flooring_product" ADD CONSTRAINT "flooring_product_costUnitId_fkey" FOREIGN KEY ("costUnitId") REFERENCES "flooring_unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
