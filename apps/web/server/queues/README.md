Queue publishing no longer belongs to the web app.

Current async workflow path:
- `apps/web` writes governing state and a `QueueOutboxEvent` in one DB transaction.
- `apps/relay` claims pending outbox rows, validates the payload contract from `@builders/domain`, and publishes BullMQ jobs.
- `apps/worker` consumes the queue and executes the workflow.

Ownership:
- `@builders/domain` owns queue names, job names, payload schemas, idempotency rules, and retry defaults.
- `packages/db` owns outbox persistence.
- `apps/relay` is the only BullMQ publisher after cutover.
- `apps/web` must not import BullMQ directly.
