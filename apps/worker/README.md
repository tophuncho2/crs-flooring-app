This workspace contains the active background worker runtime for the monorepo.

Current invoice runtime:
- `src/bootstrap.ts` starts the BullMQ worker and queue event listeners.
- `src/env.ts` validates queue Redis, worker concurrency, and storage credentials.
- `src/processors/process-work-order-invoice.ts` claims invoice generations, loads the invoice source, builds the invoice model, renders the PDF, uploads it, and updates generation/artifact state.
- `src/render/render-work-order-invoice.ts` renders the PDF document.

Local start:
- `npm run dev:worker` from the repo root
- `npm run start --workspace @builders/worker` after the workspace has been built

Required env:
- `QUEUE_REDIS_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_DEFAULT_REGION`
- `AWS_ENDPOINT_URL`
- `AWS_S3_BUCKET_NAME`
- `AWS_SECRET_ACCESS_KEY`
- optional: `INVOICE_WORKER_CONCURRENCY`, `INVOICE_WORKER_LOCK_DURATION_MS`

Temporary migration fallback:
- if `QUEUE_REDIS_URL` is unset, the worker falls back to `REDIS_URL`

Worker boundary:
- consumes BullMQ jobs only
- does not publish jobs
- does not own outbox dispatch
- does not import from `apps/web`
