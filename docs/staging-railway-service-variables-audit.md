# Staging Railway Service Variables Audit

**Date:** 2026-04-26
**Project:** flooring-system (id `bee38db7-8a55-4d63-ae5f-805e48ab56b6`)
**Environment:** Staging (id `2bad2226-8dca-418d-ae18-2381db5b2d56`)
**Services audited:** `tsx-flooring-relay`, `tsx-flooring-worker`, `tsx-flooring-app`
**Trigger:** Sweep 5 wired 3 new BullMQ queues (pending-save, finalize, void cut log). Worker now has 4 queues. Verifying batch size, intervals, TTLs, max attempts, Bull Board, concurrency, lock duration, connection wiring on each service.

**Edits made:** none. Audit-only, per the running API-route work.

## Headlines

- **CRITICAL — Bull Board password contains smart quotes** on `tsx-flooring-relay`: `BULL_BOARD_PASSWORD=‘MacPop26’`. Those `‘` `’` are U+2018 / U+2019 (curly quotes), not ASCII. The actual password is currently the 10-character string `‘MacPop26’` including curly quotes. Almost certainly a paste-from-Apple-Notes / iOS-keyboard bug. Anyone trying to log in by typing `MacPop26` will fail.
- **6 sweep-5 worker concurrency / lock-duration vars not set** on `tsx-flooring-worker`. They fall back to safe defaults (concurrency=1, lockDuration=60_000ms) by design, so the worker boots and processes correctly. Flagging only because they were just introduced and you may want to set them explicitly for visibility / future tuning.
- **All 4 relay tuning vars not set** on `tsx-flooring-relay`. `RELAY_BATCH_SIZE`, `RELAY_POLL_INTERVAL_MS`, `RELAY_CLAIM_TTL_MS`, `RELAY_MAX_ATTEMPTS` all fall back to defaults (20, 2_000ms, 30_000ms, 5). Same reasoning as above — fine for staging volumes, but explicit is better.
- **`RATE_LIMIT_PREFIX` on `tsx-flooring-app` says `:web:production`** in the Staging environment. Functionally harmless (Redis instances are per-env), but the label is wrong and confusing.
- **No connection-pooling params** in any `DATABASE_URL`. With 4 worker queues + relay poller + web routes hitting one Postgres instance, this is fine for staging volumes but worth noting before a load test.
- **Stale / cargo-cult vars on relay:** AWS S3 placeholders, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RATE_LIMIT_PREFIX` — relay uses none of these. Cleanup candidates, not bugs.
- **Worker has both `QUEUE_REDIS_URL` and `REDIS_URL` set** to the same value. The env schema prefers `QUEUE_REDIS_URL`, so the duplicate is harmless. Pick one for clarity.

## Counts

| Concern | Count |
|---|---|
| Critical (active bug) | **1** (Bull Board password smart quotes) |
| Functional gap (defaults are safe but worth setting explicitly) | **10** (4 relay tuning + 6 sweep-5 worker tuning) |
| Hygiene / mislabeling | **4** (`RATE_LIMIT_PREFIX=:production` on staging app, AWS placeholders on relay, `NEXTAUTH_*` on relay, duplicate Redis URL on worker) |
| Required vars actually missing | **0** |
| Sweep-5-attributable regressions | **0** (all 6 new vars have defaults that match prior `MATERIALIZE_WORKER_*` behavior) |

---

## Service-by-service findings

### `tsx-flooring-relay` (id `7b9ce340-…`)

**Schema source:** [apps/relay/src/env.ts](../apps/relay/src/env.ts)

| Var | Set? | Value (or default) | Verdict |
|---|---|---|---|
| `QUEUE_REDIS_URL` | ✓ | internal Redis URL | OK |
| `REDIS_URL` | — | (not set) | OK — `QUEUE_REDIS_URL` wins; fallback is unused |
| `DATABASE_URL` | ✓ | `postgres.railway.internal:5432/railway` | OK; no pooling params |
| `RELAY_BATCH_SIZE` | — | default `20` | OK at staging volume; consider setting explicitly |
| `RELAY_POLL_INTERVAL_MS` | — | default `2000` | OK |
| `RELAY_CLAIM_TTL_MS` | — | default `30000` | OK |
| `RELAY_MAX_ATTEMPTS` | — | default `5` | OK |
| `BULL_BOARD_ENABLED` | ✓ `true` | — | OK; required staging gate |
| `BULL_BOARD_USERNAME` | ✓ `admin` | — | OK |
| `BULL_BOARD_PASSWORD` | ✓ `‘MacPop26’` | — | 🚨 **CRITICAL — contains U+2018 / U+2019 curly quotes; not ASCII apostrophes.** Re-set as `MacPop26` (or whatever the intended literal is) without the surrounding curly quotes. |
| `BULL_BOARD_HOST` | — | default `0.0.0.0` | OK on Railway |
| `BULL_BOARD_PORT` / `PORT` | — | falls back to `3011` | OK only if Railway's edge target port is also 3011. Verify in service settings; if Railway injects `PORT` at runtime, the schema will pick it up via `parsed.PORT`. |
| `BULL_BOARD_BASE_PATH` | — | default `/admin/queues` | OK |
| `RAILWAY_ENVIRONMENT_NAME` | ✓ `Staging` | — | OK |
| `RAILWAY_SERVICE_NAME` | ✓ `tsx-flooring-relay` | — | OK |
| `AWS_*` (5 vars, "replace-me" placeholders) | ✓ | — | hygiene — relay doesn't use S3, safe to delete |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | ✓ | — | hygiene — relay doesn't use auth, safe to delete |
| `RATE_LIMIT_PREFIX` | ✓ `builderswebapp` | — | hygiene — relay doesn't rate-limit, safe to delete |

### `tsx-flooring-worker` (id `5d81ecf1-…`)

**Schema source:** [apps/worker/src/env.ts](../apps/worker/src/env.ts)

| Var | Set? | Value (or default) | Verdict |
|---|---|---|---|
| `QUEUE_REDIS_URL` | ✓ | internal Redis URL | OK |
| `REDIS_URL` | ✓ | same value | redundant; harmless |
| `DATABASE_URL` | ✓ | `postgres.railway.internal:5432/railway` | OK; no pooling params |
| `MATERIALIZE_WORKER_CONCURRENCY` | — | default `1` | OK |
| `MATERIALIZE_WORKER_LOCK_DURATION_MS` | — | default `60000` | OK |
| `PENDING_SAVE_CUT_LOG_WORKER_CONCURRENCY` | — | default `1` | sweep-5 new; OK by default |
| `PENDING_SAVE_CUT_LOG_WORKER_LOCK_DURATION_MS` | — | default `60000` | sweep-5 new; OK by default |
| `FINALIZE_CUT_LOG_WORKER_CONCURRENCY` | — | default `1` | sweep-5 new; OK by default |
| `FINALIZE_CUT_LOG_WORKER_LOCK_DURATION_MS` | — | default `60000` | sweep-5 new; OK by default |
| `VOID_CUT_LOG_WORKER_CONCURRENCY` | — | default `1` | sweep-5 new; OK by default |
| `VOID_CUT_LOG_WORKER_LOCK_DURATION_MS` | — | default `60000` | sweep-5 new; OK by default |
| `RAILWAY_ENVIRONMENT_NAME` | ✓ `Staging` | — | OK |
| `RAILWAY_SERVICE_NAME` | ✓ `tsx-flooring-worker` | — | OK |
| `AWS_*` (real Tigris creds) | ✓ | — | unclear — worker code doesn't read S3 today; if not used by `materialize-import-batch` or future cut-log handlers, candidate for cleanup. Leaving alone defensively. |

### `tsx-flooring-app` (id `76d55a29-…`)

| Var | Set? | Value | Verdict |
|---|---|---|---|
| `DATABASE_URL` | ✓ | `postgres.railway.internal:5432/railway` | OK; no pooling params |
| `NEXTAUTH_SECRET` | ✓ | (32-char b64) | OK |
| `NEXTAUTH_URL` | ✓ | `https://builders-app-staging.up.railway.app` | OK |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | ✓ | Tigris creds | OK |
| `AWS_DEFAULT_REGION` | ✓ `iad` | — | OK |
| `AWS_ENDPOINT_URL` | ✓ `https://t3.storageapi.dev` | — | OK |
| `AWS_S3_BUCKET_NAME` | ✓ `s3-file-storage-h7q78xl9l` | — | OK |
| `RATE_LIMIT_REDIS_URL` | ✓ | internal Redis | OK |
| `RATE_LIMIT_PREFIX` | ✓ `builderswebapp:web:production` | — | ⚠️ **mislabeled** — this is Staging, prefix says `:production`. Re-set to `builderswebapp:web:staging`. |
| `REDIS_URL` | ✓ | internal Redis | unused by web (web only writes to outbox in Postgres). Harmless. |
| `QUEUE_REDIS_URL` | — | (not set) | correct — web is a producer to the Postgres outbox, not a Redis publisher. Relay bridges to BullMQ. |

---

## Cross-cutting observations

1. **Single shared Redis** (`redis-tdpp.railway.internal:6379`) backs:
   - Relay BullMQ producer (4 queues)
   - Worker BullMQ workers (4 `Worker` + 4 `QueueEvents`, ~8+ persistent connections)
   - Web rate-limiter
   - Bull Board UI (4 queues observed)
   At staging volumes this is fine. ioredis with `maxRetriesPerRequest: null` (set in [apps/worker/src/queues/connection.ts](../apps/worker/src/queues/connection.ts)) means workers will hold connections through transient blips rather than failing fast.

2. **Single shared Postgres** for all three services + relay poller. No `?pgbouncer=true&connection_limit=N` in any URL. With Prisma defaults (`num_physical_cpus * 2 + 1`), each service opens its own pool. Sum at peak ≈ web pool + relay pool + worker pool. Fine for now; revisit before any load test.

3. **`RAILWAY_PRIVATE_DOMAIN` for relay is `bwa-relay.railway.internal`** — non-default name. If the web app calls relay directly (e.g. for Bull Board iframe or admin link), confirm it points at this hostname.

4. **The 4 worker queues all default to concurrency=1.** Total in-flight jobs = 4. If you ever want pending-save/finalize/void to run higher than materialize, set the per-topic env vars individually rather than touching `MATERIALIZE_WORKER_CONCURRENCY` — the schema is already shaped for that.

## Suggested fixes (in priority order)

1. **Fix Bull Board password on relay.** Re-set `BULL_BOARD_PASSWORD` without curly quotes:
   ```
   railway variable -s tsx-flooring-relay -e Staging set BULL_BOARD_PASSWORD=MacPop26
   ```
   (Confirm intended value with whoever set it; do not change blindly — the curly-quoted value is the *current* working password.)

2. **Fix `RATE_LIMIT_PREFIX` on web.** Re-set to `builderswebapp:web:staging`.

3. **(Optional) Set the 10 missing tuning vars explicitly** so future readers see staging's intended posture rather than relying on schema defaults. Suggested values (= current defaults, just made explicit):
   - relay: `RELAY_BATCH_SIZE=20`, `RELAY_POLL_INTERVAL_MS=2000`, `RELAY_CLAIM_TTL_MS=30000`, `RELAY_MAX_ATTEMPTS=5`
   - worker: 6× `*_CUT_LOG_WORKER_{CONCURRENCY=1, LOCK_DURATION_MS=60000}`

4. **(Optional, hygiene) Strip unused vars from relay:** `AWS_*`, `NEXTAUTH_*`, `RATE_LIMIT_PREFIX`.

5. **(Optional, hygiene) Drop `REDIS_URL` from worker** (keep only `QUEUE_REDIS_URL`).

## Verification commands run

```sh
RAILWAY_TOKEN=… railway status --json   # discover env+service IDs
RAILWAY_TOKEN=… railway variable -s tsx-flooring-relay  -e Staging --kv
RAILWAY_TOKEN=… railway variable -s tsx-flooring-worker -e Staging --kv
RAILWAY_TOKEN=… railway variable -s tsx-flooring-app    -e Staging --kv
```

No mutations issued.
