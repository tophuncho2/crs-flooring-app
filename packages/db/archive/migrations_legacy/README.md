This directory is archival only.

Operational migrations for `builderswebapp` live exclusively in `packages/db/prisma/migrations`.

Use `npx prisma migrate deploy` only against the active `prisma/migrations` chain. Files in `prisma/migrations_legacy` are retained for historical reference and should not be copied back into the active deploy path.
