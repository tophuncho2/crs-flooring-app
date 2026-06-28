-- Better Auth — Phase A (ADDITIVE). Stands up the Better Auth core tables
-- (Session, Account, Verification) + the columns Better Auth requires on "User"
-- (name, emailVerified, image, updatedAt), plus the lean UserInvite table for
-- invite-only, rank-scoped provisioning.
--
-- ADDITIVE ONLY: "password" and "isVerified" are intentionally KEPT so the
-- existing NextAuth credentials flow keeps working until the code cut-over.
-- They are dropped in a later Phase-B migration once Google SSO is verified.
-- Existing users keep their rows; their Account link is created on first Google
-- sign-in (same email → linked, nobody is locked out, nobody resets).

-- "User": Better Auth required columns (backfilled on existing rows by defaults).
ALTER TABLE "User" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN     "image" TEXT;
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Session
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- Account
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- Verification
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- UserInvite (invite-only, rank-scoped provisioning)
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rank" "UserRank" NOT NULL,
    "token" TEXT NOT NULL,
    "invitedBy" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserInvite_token_key" ON "UserInvite"("token");
CREATE INDEX "UserInvite_email_idx" ON "UserInvite"("email");

-- Foreign keys
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
