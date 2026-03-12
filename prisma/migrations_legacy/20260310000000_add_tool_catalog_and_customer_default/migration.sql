-- Set customer as the default user role
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';

-- Billing tool catalog
CREATE TABLE "Tool" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "monthlyPriceCents" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tool_slug_key" ON "Tool"("slug");
CREATE INDEX "Tool_slug_idx" ON "Tool"("slug");

-- User tool unlock mapping
CREATE TABLE "UserToolAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deactivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserToolAccess_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserToolAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserToolAccess_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserToolAccess_userId_toolId_key" UNIQUE ("userId", "toolId")
);

CREATE INDEX "UserToolAccess_userId_idx" ON "UserToolAccess"("userId");
CREATE INDEX "UserToolAccess_toolId_idx" ON "UserToolAccess"("toolId");
