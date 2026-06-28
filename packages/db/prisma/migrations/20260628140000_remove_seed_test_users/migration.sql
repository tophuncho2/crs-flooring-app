-- Retire the legacy password-era test accounts (admin@test.com / builder@test.com).
-- Under Google SSO they can never authenticate (non-company domain, no Google
-- account, password path removed) and their .env seed vars are gone, so the seed
-- no longer recreates them. Scoped to the two known emails: a safe no-op on any
-- env where they don't exist (e.g. main).
--
-- UserLoginActivity FK is onDelete: SetNull, so those rows would otherwise survive
-- with a null user — delete them explicitly. AppMutationReceipt + Session + Account
-- all cascade on the User delete.
DELETE FROM "UserLoginActivity" WHERE "userEmail" IN ('admin@test.com', 'builder@test.com');
DELETE FROM "User" WHERE "email" IN ('admin@test.com', 'builder@test.com');
