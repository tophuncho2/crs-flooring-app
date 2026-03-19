# Workers Blueprint
## Planned BullMQ Worker Runtime For Railway

Workers are not installed yet. This blueprint defines the target state so worker rollout does not become an infrastructure redesign later.

## Worker Role

- consume BullMQ queues from Redis
- load current truth from Postgres
- perform async or retryable work
- write resulting state changes back through established app data rules

## Worker Boundaries

Workers should handle:
- notifications
- document generation
- external syncs
- retryable background processing

Workers should not own:
- primary transactional writes that must complete in the request cycle
- business truth outside Postgres

## Railway Expectations

- deploy workers as the `bullmq` service
- keep the service private
- share the same env variable contract as the app for Postgres and Redis
- add worker-specific concurrency vars only when the runtime exists

## Install Sequence

1. define queue contracts in shared code
2. install worker runtime
3. deploy the `bullmq` Railway service
4. enable queue-producing features behind a safe flag
