-- Phase D + E: user-management columns in, NextAuth remnants out.
--
-- RUN ORDER: deploy the application first (it no longer reads password/isVerified,
-- and Login Activity now reads the Session table) THEN apply this migration. The
-- UserLoginActivity drop below is only safe once the re-point is live.

-- D1: invites no longer carry a secret token (email-match gate; Google proves the
-- email). Dropping the column also drops its unique index.
ALTER TABLE "UserInvite" DROP COLUMN "token";

-- D6: manager-controlled activation gate.
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- E2/E3: legacy NextAuth columns. `password` was the credentials hash; `isVerified`
-- was the old admin-approval flag — both unused under passwordless Google SSO.
ALTER TABLE "User" DROP COLUMN "isVerified";
ALTER TABLE "User" DROP COLUMN "password";

-- E4: the append-only login log is retired in favour of Better Auth `Session` rows.
DROP TABLE "UserLoginActivity";
