# Railway Blueprint
## Target Railway Shape For App, Postgres, Redis, And Future Workers

This blueprint defines the Railway target state for this project.

Current constraint:
- workers are not installed yet

That means Railway should be designed now so the app can run cleanly today and BullMQ workers can be added without reworking service boundaries later.

## Target Service List

- `apps repo`
- `postgres`
- `redis`
- `bullmq`

## Service Intent

### `apps repo`
- hosts the main app deployment
- owns web traffic and API routes
- enqueues background jobs but should not perform long-running work inline

### `postgres`
- remains the source of truth
- stores all durable business state
- should be reachable privately by app and future workers

### `redis`
- supports queue transport and short-lived coordination
- should be treated as disposable infrastructure, not durable truth

### `bullmq`
- represents the worker runtime boundary
- should stay private inside Railway
- is planned now even if worker code is not installed yet

## Rollout Sequence

1. confirm Railway service boundaries and names
2. connect the app service to Postgres and Redis
3. standardize environment variables across local and Railway
4. define BullMQ queue prefixes and job ownership
5. install and deploy workers as the `bullmq` service

## Rules

- keep app and worker responsibilities separate
- use private networking for service-to-service traffic
- do not make Redis or BullMQ public services
- mirror the same topology in staging and production when those environments exist
