This workspace contains the relay runtime for async job publication.

Current responsibility:
- claim pending `QueueOutboxEvent` rows from Postgres
- validate payloads using `@builders/domain`
- publish BullMQ jobs with deterministic `jobId` values
- mark outbox rows dispatched or rescheduled for retry
- emit structured dispatch logs

It does not:
- load work-order source data for business decisions
- render PDFs
- import from `apps/web`

Local start:
- `npm run dev:relay` from the repo root
- `npm run start --workspace @builders/relay` after the workspace has been built

Required env:
- `DATABASE_URL`
- `QUEUE_REDIS_URL`
- optional: `RELAY_BATCH_SIZE`, `RELAY_POLL_INTERVAL_MS`, `RELAY_CLAIM_TTL_MS`, `RELAY_MAX_ATTEMPTS`

Temporary migration fallback:
- if `QUEUE_REDIS_URL` is unset, the relay falls back to `REDIS_URL`
