# Railway Blueprint
## Service Topology, Environment Management, and Deployment Standards

This document defines how Railway should be structured for internal company systems using Next.js, Postgres, Redis, workers, and optional n8n.

The goal is clean service boundaries, safe environment management, predictable deployments, and reusable infrastructure standards.

---

# 1. Purpose

Railway is the infrastructure layer responsible for:
- application hosting
- service networking
- environment variable management
- managed databases
- managed Redis
- deployment coordination

Railway should be configured intentionally from the start so environments remain clean and reproducible.

---

# 2. Core Principles

## 2.1 Separate responsibilities by service
Do not overload one service with unrelated runtime responsibilities.

## 2.2 Keep environments isolated
- local
- staging
- production

These must not share live infrastructure.

## 2.3 Use internal networking where possible
Internal services should communicate privately.

## 2.4 Public exposure should be minimal
Only browser-facing or webhook-facing services should be public.

---

# 3. Recommended Railway Service Topology

For an internal Next.js system with workers:

```text
web
worker
postgres-app
redis
n8n-main        # optional
n8n-worker      # optional
postgres-n8n    # optional
```

Optional:
- object storage integration if using S3-compatible provider

---

# 4. Service Responsibilities

## 4.1 `web`
Main Next.js app.

Responsible for:
- frontend
- API routes
- auth
- immediate domain mutations
- queue producers

## 4.2 `worker`
BullMQ worker runtime.

Responsible for:
- background jobs
- retries
- send/export processing
- fan-out tasks

## 4.3 `postgres-app`
Primary application database.

Responsible for:
- operational source of truth
- application persistence

## 4.4 `redis`
Queue and coordination store.

Responsible for:
- BullMQ transport
- lightweight coordination
- idempotency/locking if used

## 4.5 `n8n-main`
Automation UI and orchestration layer.

## 4.6 `n8n-worker`
Optional n8n worker for queue mode.

## 4.7 `postgres-n8n`
Dedicated Postgres for n8n persistence.

Do not mix app DB and n8n DB unless absolutely necessary.

---

# 5. Environment Layout

## 5.1 Minimum environments
- `staging`
- `production`

Local development should not depend on Railway production resources.

## 5.2 Rules
- each environment gets its own Postgres
- each environment gets its own Redis
- each environment gets its own secrets
- staging mirrors production topology

## 5.3 Naming standard
Keep service names stable and simple:
- `web`
- `worker`
- `postgres-app`
- `redis`

Avoid renaming once internal references exist.

---

# 6. Networking Standards

## 6.1 Internal traffic
Use Railway private networking for service-to-service communication.

Examples:
- web → postgres-app
- web → redis
- worker → redis
- worker → postgres-app
- n8n → web or worker if needed

## 6.2 Public traffic
Only expose:
- web
- n8n-main if UI/webhooks require it

Workers should generally remain private.

---

# 7. Environment Variable Standards

## 7.1 App service vars

```env
NODE_ENV=
APP_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=

DATABASE_URL=
DIRECT_URL=

REDIS_URL=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

QUEUE_PREFIX=

S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

## 7.2 Worker vars

```env
DATABASE_URL=
REDIS_URL=
QUEUE_PREFIX=
WORKER_CONCURRENCY=
```

## 7.3 n8n vars
If used, give n8n its own DB and queue config.

---

# 8. Secrets Management Standards

## 8.1 Rules
- never commit secrets
- use Railway variables or ignored local env files
- keep naming consistent across environments
- document all required vars in `.env.example`

## 8.2 Ownership
Each service should receive only the vars it actually needs.

---

# 9. Deployment Standards

## 9.1 Web deploy rules
- build must pass before deploy
- migrations must be controlled
- staging first for risky changes

## 9.2 Worker deploy rules
- worker deploys independently
- queue contracts must stay compatible
- monitor failed jobs after deploy

## 9.3 Migration rules
- apply migrations intentionally
- do not improvise production schema changes
- know rollback/recovery path

---

# 10. Build and Start Command Standards

## 10.1 Web
Typical commands:

```bash
npm run build
npm run start
```

## 10.2 Worker
Typical commands:

```bash
npm run worker:build
npm run worker:start
```

## 10.3 Migration step
Use deploy-safe migration command in controlled deployment flow:

```bash
npx prisma migrate deploy
```

---

# 11. Scaling Standards

## 11.1 Services that may scale horizontally
- `web`
- `worker`
- `n8n-worker`

## 11.2 Services that usually stay single-instance
- `postgres-app`
- `postgres-n8n`
- `redis`
- `n8n-main`

## 11.3 Scaling rules
Scale only after measuring:
- DB connections
- queue depth
- response time
- worker backlog

---

# 12. Database Hosting Standards On Railway

## 12.1 Required checks
- backups enabled
- restore understood
- connection ceilings known
- pooling strategy aligned with Prisma

## 12.2 App DB rules
- separate from n8n DB
- separate by environment
- no local dev against production

---

# 13. Redis Hosting Standards On Railway

## 13.1 Required checks
- memory capacity understood
- connection usage monitored
- queue prefixes isolated by environment
- no shared prod/local usage

---

# 14. Worker + Redis + Postgres Interaction Model

```text
Web mutation commits to Postgres
  ↓
Web enqueues job to Redis
  ↓
Worker pulls job from Redis
  ↓
Worker reads/writes Postgres
  ↓
Worker records result / status / log
```

Rules:
- Redis transports
- Postgres holds truth
- worker is stateless between jobs

---

# 15. n8n Hosting Standards

If n8n is used:
- give it separate Postgres
- keep its secrets isolated
- keep its public exposure limited
- decide clearly what logic stays in app vs n8n

Use n8n for orchestration, not for core domain ownership.

---

# 16. Monitoring Standards

For Railway services, monitor:
- deploy success/failure
- service restarts
- CPU and memory
- connection counts
- queue backlogs
- DB health
- worker job failures

---

# 17. Backup and Recovery Standards

Document:
- which services are stateful
- backup responsibility
- restore path
- how to recover Redis-backed workflows after failure
- how to replay jobs safely if needed

Stateful services:
- `postgres-app`
- `postgres-n8n`
- possibly object storage

Redis is recoverable, but not authoritative.

---

# 18. Security Standards

## 18.1 Public exposure
Only expose what must be public.

## 18.2 Internal networking
Prefer private service communication.

## 18.3 Secrets
- Railway vars only
- no secrets in code
- no secrets duplicated unnecessarily

## 18.4 Access
- control who can manage Railway project
- separate deploy responsibility if team grows

---

# 19. Current App-Specific Railway Plan

For the flooring platform, recommended Railway layout:

- `web`
- `worker`
- `postgres-app`
- `redis`
- `n8n-main`
- `n8n-worker`
- `postgres-n8n`

Priority order:
1. stabilize `web + postgres-app`
2. add `redis`
3. add `worker`
4. move heavy jobs
5. add `n8n` only where orchestration is justified

---

# 20. Reusable Standard For Future Apps

For every future internal app:

1. define service boundaries before deploying
2. separate app DB and automation DB
3. isolate environments
4. keep web and worker separate
5. centralize env naming
6. use private networking
7. scale only after measuring
8. document restore and rollback early

---

# 21. Document Sections To Keep Updating

Use this file as a living Railway standard with these maintained sections:

- service map
- env var map
- public vs private services
- scaling decisions
- stateful service inventory
- deploy flow
- migration flow
- rollback flow
- recovery process

---

If needed, this file should be copied forward into future internal systems and updated per project instead of rewriting Railway standards from scratch.
