This workspace contains the active background worker runtime for the monorepo.

Current invoice runtime:
- `src/bootstrap.ts` starts the BullMQ worker and queue event listeners.
- `src/env.ts` validates Redis, worker concurrency, and storage credentials.
- `src/processors/process-work-order-invoice.ts` loads the work-order invoice source, builds the invoice model, renders the PDF, uploads it, and updates DB state.
- `src/render/render-work-order-invoice.ts` renders the PDF document.

Local start:
- `npm run dev:worker` from the repo root
- `npm run start --workspace @builders/worker` after the workspace has been built

Required env:
- `REDIS_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_DEFAULT_REGION`
- `AWS_ENDPOINT_URL`
- `AWS_S3_BUCKET_NAME`
- `AWS_SECRET_ACCESS_KEY`
- optional: `INVOICE_WORKER_CONCURRENCY`, `INVOICE_WORKER_LOCK_DURATION_MS`
