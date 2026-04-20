# Queue Schemas

> **What:** Zod schemas, queue names, job names, and retry policies that define the inter-service contract between producers and workers. The shape lives in domain because every service agrees on it.

## Where

`packages/domain/src/queue/{queue-name}.ts`.

## Exports

Queue-name and job-name string constants, the Zod schema for the job payload, the retry/backoff policy object, and any status enums the worker and producers share.

## Example

`WORK_ORDER_AUTO_ALLOCATION_QUEUE`, `AUTO_ALLOCATE_WORK_ORDER_JOB`, `WORK_ORDER_AUTO_ALLOCATION_RETRY_POLICY` in `packages/domain/src/queue/auto-allocate-work-order.ts`.
