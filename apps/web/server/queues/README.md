Queue publishing no longer belongs to the web app.

Current async invoice path:
- `apps/web` writes `FlooringInvoiceGeneration` state and a `QueueOutboxEvent` in one DB transaction.
- `apps/relay` claims pending outbox rows, validates the payload contract from `@builders/domain`, and publishes BullMQ jobs.
- `apps/worker` consumes the queue and generates the invoice PDF.

Ownership:
- `@builders/domain` owns queue names, job names, payload schemas, idempotency rules, and retry defaults.
- `packages/db` owns outbox persistence and invoice generation/artifact repositories.
- `apps/relay` is the only BullMQ publisher after cutover.
- `apps/web` must not import BullMQ directly.

Invoice queue details:
- Queue: `flooring-invoice-generation`
- Job: `generate-work-order-invoice`
- Job id: the invoice idempotency key
- Retry policy: 5 attempts with exponential backoff and a 30-second base delay

Outbox topic:
- `invoice.generation.requested.v1`
