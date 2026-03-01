INSERT INTO "Hotkey" ("id", "key", "combination", "action", "updatedAt") VALUES
  ('46dfb2cd-3010-49fc-8a2c-59e436020001', 'Builder Panel', 'SHIFT + B', 'Open Builder Panel (builders only)', NOW()),
  ('46dfb2cd-3010-49fc-8a2c-59e436020002', 'Warehouse', 'SHIFT + W', 'Open Warehouse', NOW()),
  ('46dfb2cd-3010-49fc-8a2c-59e436020003', 'Logout', 'SHIFT + ESC', 'Logout', NOW()),
  ('46dfb2cd-3010-49fc-8a2c-59e436020004', 'Products', 'SHIFT + P', 'Open Products', NOW()),
  ('46dfb2cd-3010-49fc-8a2c-59e436020005', 'Estimator', 'SHIFT + E', 'Open Estimator', NOW()),
  ('46dfb2cd-3010-49fc-8a2c-59e436020006', 'Hotkeys', 'SHIFT + H', 'Open Hotkeys Popup', NOW())
ON CONFLICT ("id") DO UPDATE
SET
  "key" = EXCLUDED."key",
  "combination" = EXCLUDED."combination",
  "action" = EXCLUDED."action",
  "updatedAt" = NOW();
