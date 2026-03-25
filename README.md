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
npm run build:web
npm run start:web
npm run build:worker
npm run start:worker
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

Copy values from `.env.example` into the repo-root `.env` before starting local services.

Local development uses the repo-root `.env` as the single source of truth for:

- `apps/web`
- `apps/worker`
- `packages/db`

- `DATABASE_URL` is required for all DB-backed workspaces
- `NEXTAUTH_*` variables are only required when auth/session flows are used
- `AWS_*` variables are only required when storage/file flows are used
- `REDIS_URL` enables shared rate limiting and the worker queue connection

If `REDIS_URL` is omitted, `apps/worker` starts in a non-destructive scaffold mode and exits after reporting the registered processors.

## Deployment

Database changes follow Model A:

- run `npm run db:deploy` as its own explicit database deployment step
- deploy `apps/web` after the DB step
- deploy `apps/worker` after the DB step
- do not run migrations in web or worker build/start flows
- run `npm run db:seed` only as an explicit environment setup action

For Railway or similar multi-service deployment, use service-specific commands:

- web build: `npm run build:web`
- web start: `npm run start:web`
- worker build: `npm run build:worker`
- worker start: `npm run start:worker`
