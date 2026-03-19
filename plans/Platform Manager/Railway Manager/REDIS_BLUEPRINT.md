# Redis Blueprint
## Railway Redis Role For Queue Transport And Coordination

Redis exists in this Railway plan primarily to support BullMQ and lightweight coordination.

## Approved Uses

- BullMQ queue transport
- delayed job scheduling
- retries and backoff state
- short-lived locks or dedupe keys

## Not Approved As Source Of Truth

- persistent business records
- long-term state
- analytics storage

## Required Setup Decisions

- one Redis service per Railway environment
- explicit `QUEUE_PREFIX`
- app and future workers share the same Redis connection contract
- Redis remains private to Railway services

## Current Gap

Workers are not installed yet, so Redis may be connected before queue consumers exist.

That is acceptable as long as:
- the app does not depend on jobs being processed before worker rollout
- queued work is feature-gated or disabled until consumers are live
