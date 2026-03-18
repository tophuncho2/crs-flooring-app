# Environment Variables Plan
## Variable Inventory, Ownership, And Environment Discipline

This file defines the environment-variable structure for the project.

It should be used to keep configuration:
- clean
- documented
- environment-safe
- reusable across future projects

---

# 1. Purpose

Environment variables control runtime behavior, service connections, secrets, and deployment behavior.

If they are unmanaged, the system becomes:
- brittle
- hard to deploy
- hard to debug
- unsafe across environments

---

# 2. Rules

- never commit secrets
- keep names consistent across local/staging/prod
- document every required variable
- validate env vars on boot
- assign ownership by service

---

# 3. Environment Categories

## App
- app URLs
- auth secrets
- feature flags if needed

## Database
- pooled runtime DB URL
- direct migration DB URL

## Redis
- Redis connection values
- queue prefixes

## Storage
- S3 or object-storage config

## Automation
- n8n URLs/keys if used

## Worker
- worker concurrency
- queue config

---

# 4. Recommended Variables

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
CACHE_PREFIX=

S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

WORKER_CONCURRENCY=

N8N_BASE_URL=
N8N_API_KEY=
```

---

# 5. Environment Ownership

## Web app
Needs:
- app
- auth
- database
- Redis if producing jobs
- storage

## Worker
Needs:
- database
- Redis
- queue config
- storage if generating files

## n8n
Needs:
- its own DB config if self-hosted
- app integration config
- optional Redis if queue mode is used

---

# 6. Files And Handling

Recommended:
- `.env.example`
- `.env.local`
- Railway environment variables for deployed environments

Do not rely on undocumented local-only values.

---

# 7. Validation Standard

Environment variables should be validated on app boot so the system fails clearly if misconfigured.

Validation should check:
- required presence
- valid URL shape where needed
- integer/number values where needed
- environment-specific requirements

---

# 8. Definition Of Success

This plan is successful when:
- every variable is documented
- every service knows what it owns
- no one guesses env requirements
- deploys fail early and clearly if config is wrong

---

This file should be updated whenever runtime config changes materially.
