This workspace contains the background-worker scaffold for the monorepo layout.

Current status:
- `src/bootstrap.ts` is the worker entrypoint.
- `src/env.ts` validates worker-specific environment variables.
- `src/queues/connection.ts` resolves the Redis connection.
- `src/processors/index.ts` registers the currently known job contracts.

The worker is intentionally non-destructive right now:
- if `REDIS_URL` is not configured, startup exits successfully after reporting the registered processors
- job contracts are shared from `@builders/domain`
- Prisma access is shared from `@builders/db`

This keeps the worker isolated from `apps/web` while queue execution is introduced incrementally.
