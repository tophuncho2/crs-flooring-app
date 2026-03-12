-- CreateTable
CREATE TABLE "Hotkey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "combination" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotkey_pkey" PRIMARY KEY ("id")
);

-- Seed default hotkeys
INSERT INTO "Hotkey" ("id", "key", "combination", "action", "updatedAt") VALUES
  ('46dfb2cd-3010-49fc-8a2c-59e436020001', 'Open Build Panel', 'SHIFT + ~', 'Open Build Panel (builders only)', NOW()),
  ('46dfb2cd-3010-49fc-8a2c-59e436020002', 'Toggle Theme', 'SHIFT + COMMAND + /', 'Toggle theme', NOW()),
  ('46dfb2cd-3010-49fc-8a2c-59e436020003', 'Logout', 'SHIFT + ESC', 'Logout', NOW()),
  ('46dfb2cd-3010-49fc-8a2c-59e436020004', 'Products', 'SHIFT + Z', 'Open Products', NOW()),
  ('46dfb2cd-3010-49fc-8a2c-59e436020005', 'Estimator', 'SHIFT + RETURN', 'Open Estimator', NOW());
