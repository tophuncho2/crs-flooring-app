-- CreateEnum
CREATE TYPE "PendingLaborPaymentStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "JobExpenseType" AS ENUM ('LABOR', 'MATERIAL');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAssignee" (
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAssignee_pkey" PRIMARY KEY ("jobId","userId")
);

-- CreateTable
CREATE TABLE "JobPendingLaborPayment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "status" "PendingLaborPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPendingLaborPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobExpense" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "vendorId" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "expenseType" "JobExpenseType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vendor_companyName_idx" ON "Vendor"("companyName");

-- CreateIndex
CREATE INDEX "JobAssignee_userId_idx" ON "JobAssignee"("userId");

-- CreateIndex
CREATE INDEX "JobPendingLaborPayment_jobId_status_idx" ON "JobPendingLaborPayment"("jobId", "status");

-- CreateIndex
CREATE INDEX "JobPendingLaborPayment_vendorId_idx" ON "JobPendingLaborPayment"("vendorId");

-- CreateIndex
CREATE INDEX "JobExpense_jobId_idx" ON "JobExpense"("jobId");

-- CreateIndex
CREATE INDEX "JobExpense_vendorId_idx" ON "JobExpense"("vendorId");

-- AddForeignKey
ALTER TABLE "JobAssignee" ADD CONSTRAINT "JobAssignee_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignee" ADD CONSTRAINT "JobAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPendingLaborPayment" ADD CONSTRAINT "JobPendingLaborPayment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPendingLaborPayment" ADD CONSTRAINT "JobPendingLaborPayment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobExpense" ADD CONSTRAINT "JobExpense_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobExpense" ADD CONSTRAINT "JobExpense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
