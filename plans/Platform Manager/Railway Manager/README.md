# Railway Manager
## Planning Home For Railway, Infrastructure Services, And Future Worker Rollout

This folder is the dedicated planning workspace for bridging the gap between the Railway server and the app plus worker system.

Current context:
- the app is already in scope
- workers are not installed yet
- Redis, Postgres, BullMQ, and Railway service boundaries need to be defined together

## Folder Structure

- `RAILWAY_BLUEPRINT.md`
  Railway service topology and rollout target.
- `ENVIRONMENT_VARIABLES.md`
  Shared environment-variable contract for app, Redis, Postgres, and future workers.
- `REDIS_BLUEPRINT.md`
  Redis usage and rollout rules for Railway.
- `WORKERS_BLUEPRINT.md`
  BullMQ worker target state and install sequence.
- `redis/`
  Planning notes for the Railway Redis service.
- `postgres/`
  Planning notes for the Railway Postgres service.
- `apps repo/`
  Planning notes for the deployed application service and repository concerns.
- `bullmq/`
  Planning notes for queue topology, contracts, and worker integration.

## Working Rules

- Keep this folder focused on Railway-hosted infrastructure and the app-to-worker bridge.
- Update the service folders as each Railway service is configured or changed.
- Treat workers as planned infrastructure until the worker runtime is actually installed.
- Use the blueprint docs in this folder for target-state standards, then use the service folders to track service-specific setup and gaps.

Assessment files:
- [overall-assessment.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Platform%20Manager/Railway%20Manager/assessment/overall-assessment.md)
- [strengths-weaknesses.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Platform%20Manager/Railway%20Manager/assessment/strengths-weaknesses.md)
