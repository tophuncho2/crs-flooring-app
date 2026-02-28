UPDATE "Hotkey"
SET
  "combination" = 'SHIFT + COMMAND + 1-9',
  "action" = 'Apply color theme 1-9 for current light/dark mode',
  "updatedAt" = NOW()
WHERE "key" = 'Toggle Theme';
