INSERT INTO "Hotkey" ("id", "key", "combination", "action", "updatedAt") VALUES
  ('46dfb2cd-3010-49fc-8a2c-59e436020007', 'Dashboard', 'SHIFT + SPACE', 'Open Dashboard', NOW())
ON CONFLICT ("id") DO UPDATE
SET
  "key" = EXCLUDED."key",
  "combination" = EXCLUDED."combination",
  "action" = EXCLUDED."action",
  "updatedAt" = NOW();
