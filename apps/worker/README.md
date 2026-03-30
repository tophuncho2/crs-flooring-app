This workspace contains the active background worker runtime for the monorepo.

Current worker runtime:
- `src/bootstrap.ts` starts the BullMQ worker and queue event listeners.
- `src/env.ts` validates queue Redis and worker concurrency.
- `src/processors/process-work-order-auto-allocation.ts` claims auto-allocation jobs and delegates into the worker application layer.

Local start:
- `npm run dev:worker` from the repo root
- `npm run start --workspace @builders/worker` after the workspace has been built

Required env:
- `QUEUE_REDIS_URL`
- optional: `AUTO_ALLOCATION_WORKER_CONCURRENCY`, `AUTO_ALLOCATION_WORKER_LOCK_DURATION_MS`

Temporary migration fallback:
- if `QUEUE_REDIS_URL` is unset, the worker falls back to `REDIS_URL`

Worker boundary:
- consumes BullMQ jobs only
- does not publish jobs
- does not own outbox dispatch
- does not import from `apps/web`
