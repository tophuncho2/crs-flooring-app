# Deployment

> **Scope:** Railway service topology, environment configuration, service start commands.
> **Location:** Root `package.json`, `.env*` files, `packages/config/`
> **Status:** Active

## Rules

1. Three Railway services from one repo: app (Next.js), worker (BullMQ), outbox-relay.
2. Each service has its own start command — no shared process.
3. Environment variables are the only configuration mechanism. No hardcoded URLs, credentials, or service addresses.
4. `.env` for local dev, `.env.staging` and `.env.production` for deployed environments. Never commit secrets.

## Service Topology

| Service | Entry Point | Depends On |
|---------|------------|------------|
| **app** | `apps/web` — Next.js | PostgreSQL, Redis, S3 |
| **worker** | `apps/worker` — BullMQ consumer | PostgreSQL, Redis |
| **relay** | `apps/relay` — Outbox poller | PostgreSQL, Redis (BullMQ) |

All three share the same database. Redis is shared between rate limiting (app), job queues (worker/relay), and BullMQ.

## Required Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | All | PostgreSQL connection |
| `REDIS_URL` | All | Redis for BullMQ + rate limiting |
| `S3_*` | App | Object storage (photos, documents) |
| `NEXTAUTH_SECRET` | App | JWT signing |
| `SENTRY_DSN` | All | Error reporting |

## Anti-Patterns

1. **Do not** run multiple services in one process.
2. **Do not** hardcode environment-specific values — use `packages/config/`.
3. **Do not** share secrets across environments.
4. **Do not** deploy without all required env vars set — services should fail fast on missing config.

## Related Docs

- [OBSERVABILITY.md](OBSERVABILITY.md) — Sentry + structured logging per service
- [../services/RELAY.md](../services/RELAY.md) — Relay service details
- [../services/WORKER.md](../services/WORKER.md) — Worker service details