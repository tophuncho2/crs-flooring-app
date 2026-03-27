# Builders Webapp Monorepo

This repository is organized as an npm-workspaces monorepo.

## Workspace Layout

- `apps/web`: Next.js web application
- `apps/relay`: outbox dispatcher that publishes validated jobs to BullMQ
- `apps/worker`: background worker runtime that executes published jobs
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
npm run dev:relay
npm run dev:worker
npm run build:web
npm run start:web
npm run build:relay
npm run start:relay
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
- `apps/relay`
- `apps/worker`
- `packages/db`

- `DATABASE_URL` is required for all DB-backed workspaces
- `NEXTAUTH_*` variables are only required when auth/session flows are used
- `AWS_*` variables are only required when storage/file flows are used
- `RATE_LIMIT_REDIS_URL` configures web-only rate limiting
- `QUEUE_REDIS_URL` configures BullMQ for `apps/relay` and `apps/worker`
- temporary migration fallback:
  - `apps/web` may fall back from `RATE_LIMIT_REDIS_URL` to `REDIS_URL`
  - `apps/relay` and `apps/worker` may fall back from `QUEUE_REDIS_URL` to `REDIS_URL`

The worker no longer supports scaffold mode. If queue Redis is required and unavailable, `apps/worker` fails startup.

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
- relay build: `npm run build:relay`
- relay start: `npm run start:relay`
- worker build: `npm run build:worker`
- worker start: `npm run start:worker`

Current async invoice flow:

- `apps/web` authenticates the request, validates the command, writes invoice generation state, and inserts an outbox row in one DB transaction.
- `apps/relay` claims pending outbox rows, validates the payload, publishes BullMQ jobs, and marks dispatch state.
- `apps/worker` consumes BullMQ jobs, loads work-order source data, renders the invoice PDF, uploads it to storage, and writes generation/artifact completion state.
