-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "budget" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyScope" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "customerFileName" TEXT,
    "customerFileMime" TEXT,
    "customerFileData" BYTEA,
    "customerFileAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyScopeItem" (
    "id" TEXT NOT NULL,
    "dailyScopeId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyScopeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyScope_jobId_idx" ON "DailyScope"("jobId");

-- CreateIndex
CREATE INDEX "DailyScopeItem_dailyScopeId_idx" ON "DailyScopeItem"("dailyScopeId");

-- AddForeignKey
ALTER TABLE "DailyScope" ADD CONSTRAINT "DailyScope_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyScopeItem" ADD CONSTRAINT "DailyScopeItem_dailyScopeId_fkey" FOREIGN KEY ("dailyScopeId") REFERENCES "DailyScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;
