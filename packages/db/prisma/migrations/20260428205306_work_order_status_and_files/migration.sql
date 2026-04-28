-- CreateEnum
CREATE TYPE "FlooringWorkOrderStatus" AS ENUM ('IDLE', 'QUEUED', 'WORKING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "flooring_work_order" ADD COLUMN     "status" "FlooringWorkOrderStatus" NOT NULL DEFAULT 'IDLE';

-- CreateTable
CREATE TABLE "flooring_work_order_file" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "fileNumber" INTEGER NOT NULL,
    "status" "FlooringWorkOrderStatus" NOT NULL DEFAULT 'QUEUED',
    "fileKey" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "flooring_work_order_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flooring_work_order_file_workOrderId_createdAt_idx" ON "flooring_work_order_file"("workOrderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "flooring_work_order_file_workOrderId_fileNumber_key" ON "flooring_work_order_file"("workOrderId", "fileNumber");

-- CreateIndex
CREATE INDEX "flooring_work_order_status_idx" ON "flooring_work_order"("status");

-- AddForeignKey
ALTER TABLE "flooring_work_order_file" ADD CONSTRAINT "flooring_work_order_file_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
