# DATABASE

> **Briefing.** This document covers how migrations are run, the `.env` DATABASE_URL
> setup across environments, and the database protocols and actions for this repo.
> It is the single home for DB operational notes — the data layer owns them.
> Code rules for the package live in `CLAUDE.md`; this file is the runbook.

## Environments & `.env` DATABASE_URL setup

| Env | Branch / worktree | `.env` source |
| --- | --- | --- |
| Main (prod) | `main/` | own `.env` credentials |
| Staging | `staging/` | own `.env` credentials |
| Dev | `dev/`, `dev-1`, `dev-2`, `dev-3` | shared `dev` `.env` |

- Env resolution: `DOTENV_CONFIG_PATH` wins; otherwise `src/env.ts` loads the
  repo-root `.env` (`../../../.env` from `src/`). `prisma.config.ts` and the
  `db:*` package scripts pin `DOTENV_CONFIG_PATH=../../.env` so the Prisma CLI and
  the runtime read the same file.

## Running migrations

**The user always runs migrations, never Claude — unless the user explicitly says
so.** Schema changes are the user's responsibility.

All commands run from `packages/db` via the `db:*` scripts (each sets
`DOTENV_CONFIG_PATH` and `XDG_CACHE_HOME`, so they pick up the right `.env`):

| Action | Script | Notes |
| --- | --- | --- |
| Apply pending migrations | `npm run db:deploy` | Non-interactive; used on staging/main and after rolldowns. |
| Check migration state | `npm run db:migrate:status` | Reports drift / pending migrations. |

- Migrations live in `prisma/migrations/`; schema in `prisma/schema.prisma`.

## Database protocols & actions

- **`guard:prisma` (`scripts/guard-prisma.js`).** Enforces that the Prisma schema,
  `prisma.config.ts`, and `migrations/` exist only under `packages/db`, and that no
  Prisma CLI usage leaks into other packages/apps (e.g. `apps/web/server/db` is
  disallowed). The data package is the only place that may touch Prisma.
- **Data rolldown.** Main is backed up every 24 hours and rolled down into staging
  and dev periodically. In a disaster, users migrate to the staging branch and
  resume with up to 24 hours of lost data.
- **Dev data is real prod data.** Weird/junk rows in dev are likely real production
  data rolled down from main — do **not** assume a dev anomaly is a bug to fix; the
  same anomaly probably exists in main.
