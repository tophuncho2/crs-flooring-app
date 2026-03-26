Queue producers now live in the web app, while shared job contracts live in `@builders/domain`.

Current active queue path:
- `apps/web/server/queues/invoice-queue.ts` enqueues the invoice-generation job.
- `@builders/domain` owns the invoice job name, queue name, payload contract, and retry defaults.
- `apps/worker` consumes the queue and generates the invoice PDF.

Invoice queue details:
- Queue: `flooring-invoice-generation`
- Job: `generate-work-order-invoice`
- Job id: the invoice idempotency key
- Retry policy: 5 attempts with exponential backoff and a 30-second base delay
