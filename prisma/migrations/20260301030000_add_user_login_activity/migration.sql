-- CreateTable
CREATE TABLE "UserLoginActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT NOT NULL,
    "loggedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLoginActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserLoginActivity"
ADD CONSTRAINT "UserLoginActivity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "UserLoginActivity_loggedInAt_idx" ON "UserLoginActivity"("loggedInAt");

-- CreateIndex
CREATE INDEX "UserLoginActivity_userEmail_idx" ON "UserLoginActivity"("userEmail");
