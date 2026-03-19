# Redis Blueprint
## Queueing, Caching, Coordination, and Production Standards

This document is a reusable Redis guide for internal company systems. It defines how Redis should be used safely and predictably for queues, caching, short-lived coordination, and future automation infrastructure.

Redis is not the source of truth. Redis is a high-speed supporting layer.

---

# 1. Purpose

Redis should be used for:
- BullMQ queue transport
- short-lived cache
- lightweight coordination
- locks
- deduplication keys
- rate limiting if needed

Redis should not be used for:
- durable business truth
- the only copy of important operational state
- hidden business logic
- long-term analytics storage

---

# 2. Core Principles

## 2.1 Redis is support infrastructure
The canonical data store remains Postgres.

## 2.2 Redis data must be disposable
If Redis is flushed or lost:
- the system should degrade gracefully
- queues may need replay/recovery
- operational truth must still exist in Postgres

## 2.3 Namespacing is mandatory
Every queue, cache key, and lock key must be structured and environment-safe.

## 2.4 Keep responsibilities narrow
Do not let Redis become a generic dumping ground.

---

# 3. Role In System Architecture

```text
UI
  ↓
Next.js App
  ↓
API / Domain Mutation
  ↓
Postgres Commit
  ↓
Queue Job Enqueue
  ↓
Redis
  ↓
BullMQ Worker
  ↓
Async side effects
```

Optional:

```text
n8n
  ↓
Redis / Queue Mode
  ↓
n8n workers
```

---

# 4. Approved Redis Use Cases

## 4.1 Queues
- BullMQ queue transport
- job state
- retries/backoff scheduling

## 4.2 Cache
- lookup cache
- read-through cache for stable reference data
- short-lived derived views

## 4.3 Coordination
- distributed locks
- idempotency keys
- throttling
- dedupe windows

## 4.4 Not approved without clear reason
- persistent business records
- large object storage
- audit trail storage
- analytics source storage

---

# 5. Environment Variable Standard

Use a consistent set of Redis env vars:

```env
REDIS_URL=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
QUEUE_PREFIX=
CACHE_PREFIX=
```

Optional:

```env
REDIS_TLS=
REDIS_DB=
```

Rules:
- local, staging, and production should use the same names
- prefixes should differ by environment
- do not hardcode service names or credentials

---

# 6. Key Naming Standard

All Redis keys must be namespaced.

Recommended pattern:

```text
<app>:<env>:<type>:<domain>:<identifier>
```

Examples:

```text
flooring:prod:queue:work-orders:send
flooring:staging:cache:property:123
flooring:prod:lock:inventory:allocation:wo_987
flooring:prod:idempotency:sync-template:wo_456
```

Types:
- `queue`
- `cache`
- `lock`
- `idempotency`
- `rate-limit`

---

# 7. Queue Prefix Standard

Every environment must have a separate queue prefix.

Examples:

```env
QUEUE_PREFIX=flooring-local
QUEUE_PREFIX=flooring-staging
QUEUE_PREFIX=flooring-prod
```

Never share the same queue prefix across:
- dev and prod
- staging and prod
- app jobs and unrelated automation jobs

---

# 8. Redis Connection Standards

## 8.1 Centralize connection creation
Do not instantiate Redis clients ad hoc throughout the app.

Recommended structure:

```text
server/queues/
  redis.ts
  config.ts
  queues.ts
```

## 8.2 Connection ownership
- one central connection config
- controlled reuse
- separate behavior for producer vs worker if needed

## 8.3 Rules
- do not create many Redis clients per request
- do not hide client creation inside many modules
- make reconnect behavior explicit

---

# 9. BullMQ Integration Standards

## 9.1 Redis role in BullMQ
Redis transports jobs and queue state.

## 9.2 Queue design
Use stable named queues:
- `send-work-order`
- `inventory-sync`
- `document-generate`
- `notifications`

## 9.3 Job contract design
Every job should have:
- queue name
- payload type
- retry policy
- backoff policy
- failure logging

## 9.4 Producer rule
App writes jobs to Redis only after the primary DB write succeeds.

## 9.5 Consumer rule
Workers must treat Postgres as truth and Redis as transport.

---

# 10. Caching Standards

## 10.1 Cache only when useful
Cache should solve a real problem:
- expensive reads
- repeated stable lookups
- high-frequency reference data

## 10.2 Do not cache blindly
Avoid caching:
- volatile operational rows that change constantly
- records where stale data is dangerous
- large nested payloads without invalidation discipline

## 10.3 Cache TTL rules
Every cache entry should have an intentional TTL unless there is a very good reason not to.

## 10.4 Cache invalidation rules
If data changes often:
- invalidate on write
- do not rely on stale TTL expiration only

---

# 11. Locking Standards

## 11.1 Valid lock use cases
- inventory allocation
- duplicate send prevention
- idempotent external syncs
- conflict-sensitive background jobs

## 11.2 Lock key rules
Use explicit lock keys:

```text
flooring:prod:lock:inventory:wo_123
```

## 11.3 Lock expiration
Locks must always have a TTL.

## 11.4 Do not use Redis locks as the only protection
Critical correctness should still be supported by DB rules and domain logic.

---

# 12. Idempotency Standards

## 12.1 Why it matters
Queues and external systems retry. Without idempotency:
- duplicate sends happen
- duplicate notifications happen
- duplicate allocations happen

## 12.2 Use Redis idempotency keys for
- send-work-order
- external sync jobs
- import replay protection
- webhook deduplication

## 12.3 Key pattern

```text
<app>:<env>:idempotency:<action>:<entity-id>
```

---

# 13. Rate Limiting Guidance

For internal systems, rate limiting is usually lower priority, but Redis may support:
- login throttling
- high-frequency API protection
- webhook abuse protection

Keep rate-limit keys isolated and expiring.

---

# 14. Memory Management

## 14.1 Why it matters
Redis is memory-bound. Poor key discipline causes:
- evictions
- queue instability
- cache loss
- performance degradation

## 14.2 Rules
- keep payloads small
- avoid storing large objects
- use TTLs
- monitor memory growth
- know eviction policy

---

# 15. Persistence and Durability

## 15.1 Redis durability expectations
Redis should not be your only durable layer.

## 15.2 What to verify in managed Redis
- persistence mode if offered
- restart behavior
- failover behavior
- memory eviction policy

## 15.3 Operational assumption
The app must survive Redis loss without corrupting business truth.

---

# 16. Monitoring Standards

Monitor:
- memory usage
- connection count
- queue depth
- failed jobs
- retry count
- latency
- eviction events
- blocked workers

Alert on:
- runaway queue growth
- repeated job failures
- memory pressure
- connection spikes

---

# 17. Security Standards

## 17.1 Access
- keep Redis private
- no public exposure unless explicitly necessary
- use provider-managed credentials

## 17.2 Secrets
- never commit Redis credentials
- validate env vars on boot

## 17.3 Environment isolation
- separate Redis by environment
- never share production Redis with local development

---

# 18. Failure Modes

Plan for:
- Redis restart
- job backlog growth
- worker outage
- duplicate retry behavior
- lost cache

System behavior should be:
- operational data still safe
- workers recoverable
- jobs replayable where appropriate

---

# 19. Current App-Specific Recommendations

For the current flooring platform:

1. Create shared Redis connection module
2. Define queue prefixes by environment
3. Define queue names for:
- send-work-order
- inventory-sync
- template-to-work-order follow-up tasks
- document generation

4. Add idempotency keys for:
- send-work-order
- external notifications
- future webhook intake

5. Keep sync-template itself synchronous for now
6. Move heavy downstream work to BullMQ later

---

# 20. Reusable Standard For Future Apps

For every future internal app:

1. Decide Redis responsibilities early
2. Keep Postgres as source of truth
3. Centralize Redis config
4. Namespace all keys
5. Isolate environments
6. Add queue contracts before heavy jobs
7. Add monitoring before scaling workers
8. Design for retries and idempotency

---

# 21. Document Sections To Keep Updating

Use this file as a living Redis standard with these maintained sections:

- Redis provider
- connection strategy
- queue prefixes
- queue names
- cache keys
- lock strategy
- idempotency keys
- monitoring setup
- known failure modes
- recovery process

---

If needed, this file should be copied forward into future internal systems and updated per project instead of rewriting Redis standards from scratch.
