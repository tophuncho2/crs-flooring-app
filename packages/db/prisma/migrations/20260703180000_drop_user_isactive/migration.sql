-- Retire the deactivate/activate feature: drop the User.isActive column.
-- The login lockout gate that read it (`getSessionUser`) is removed in the same
-- change; the sole in-app lockout model is now delete (+ revoke-invite).
ALTER TABLE "User" DROP COLUMN "isActive";
