# Builders Webapp Monorepo

This repository is organized as an npm-workspaces monorepo.

## Workspace Layout

- `apps/web`: Next.js web application
- `apps/worker`: background worker scaffold and queue runtime entrypoint
- `packages/db`: Prisma schema, migrations, generated client boundary, and DB scripts
- `packages/domain`: shared queue contracts and pure cross-runtime domain code
- `packages/lib`: shared runtime utilities
- `packages/ui`: shared UI workspace for reusable components
- `packages/config`: shared TypeScript and ESLint configuration

## Common Commands

Run these from the repository root:

```bash
npm install
npm run dev
npm run dev:worker
npm run guard:prisma
npm run build
npm run lint
npm run typecheck
npm run test
```

Database commands:

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:deploy
npm run db:reset
npm run db:seed
npm run db:studio
```

## Environment

Copy values from `.env.example` into your local environment before starting the app.

- `DATABASE_URL` is required for all DB-backed workspaces
- `NEXTAUTH_*` variables are required for the web app
- `REDIS_URL` enables the worker queue connection

If `REDIS_URL` is omitted, `apps/worker` starts in a non-destructive scaffold mode and exits after reporting the registered processors.

## Deployment

Database changes follow Model A:

- run `npm run db:deploy` as its own explicit database deployment step
- deploy `apps/web` after the DB step
- deploy `apps/worker` after the DB step
- do not run migrations in web or worker build/start flows
- run `npm run db:seed` only as an explicit environment setup action
