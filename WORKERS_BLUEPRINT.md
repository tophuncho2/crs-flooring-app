# Workers Blueprint
## Background Jobs, Queue Processing, and Async Workflow Standards

This document defines how worker services should be designed for internal company systems using BullMQ, Redis, Postgres, and Next.js.

Workers are for heavy, asynchronous, retryable work. They are not a replacement for core transactional application logic.

---

# 1. Purpose

Workers should process:
- heavy business workflows
- retryable external actions
- document generation
- notification fan-out
- integration syncs
- expensive background recalculations

Workers should not own:
- core source-of-truth business rules in isolation
- instant user-facing edits that should complete synchronously
- database truth separate from the main app

---

# 2. Core Principles

## 2.1 Postgres remains source of truth
Workers read from and write to Postgres, but Redis transports jobs.

## 2.2 Jobs must be explicit
Every job must have:
- a queue
- a name
- a payload contract
- retry behavior
- logging

## 2.3 Jobs must be safe to retry
Idempotency matters.

## 2.4 Keep job responsibilities narrow
Do not create giant “do everything” jobs.

---

# 3. Worker Role In Architecture

```text
User Action
  ↓
API / Domain Mutation
  ↓
Postgres Commit
  ↓
Job Enqueue
  ↓
Redis / BullMQ
  ↓
Worker Service
  ↓
External Effects / Follow-up Writes
```

---

# 4. What Should Stay Synchronous vs Async

## 4.1 Keep synchronous
- create template
- edit template
- create work order
- edit work order
- template → draft work-order copy
- small transactional row changes

## 4.2 Move to workers
- send work order
- external delivery
- document generation
- notifications
- inventory sync fan-out
- external API synchronization
- long-running calculations

---

# 5. Worker Project Structure

Recommended structure:

```text
workers/
  index.ts
  processors/
    send-work-order.ts
    inventory-sync.ts
    document-generate.ts
    notifications.ts

server/queues/
  redis.ts
  config.ts
  queues.ts
  jobs/
    send-work-order.ts
    inventory-sync.ts
    template-to-work-order.ts
  contracts/
    send-work-order.ts
    inventory-sync.ts
```

Rules:
- queue definitions live in shared server code
- processors live in worker runtime
- payload types are shared

---

# 6. Job Design Standards

## 6.1 Each job should define
- queue name
- job name
- payload schema
- retry count
- backoff
- timeout behavior if needed
- idempotency expectations

## 6.2 Payload rules
Payloads should be:
- small
- typed
- explicit
- stable

Prefer:
- ids
- action context
- trace identifiers

Avoid:
- huge nested snapshots unless necessary

---

# 7. Queue Naming Standard

Use stable queue names:

```text
send-work-order
inventory-sync
document-generate
notifications
external-sync
```

Use stable job names within queues:

```text
send
retry-send
allocate
generate-pdf
notify-email
sync-vendor
```

---

# 8. Processor Standards

Every processor should:
- validate payload
- load current truth from Postgres
- perform work
- write outcome back safely
- log result
- fail clearly on error

Processors should not:
- trust stale payload blindly
- assume prior state still exists
- bypass business rules

---

# 9. Idempotency Standards

## 9.1 Why it matters
Jobs retry.
Without idempotency:
- duplicate sends happen
- duplicate documents get created
- duplicate notifications get sent

## 9.2 Idempotency strategy
Use:
- Redis idempotency keys
- DB status checks
- send markers / completed-at fields
- external correlation ids when appropriate

---

# 10. Retry Standards

## 10.1 Good retry candidates
- external API calls
- document generation
- temporary connectivity failures
- email/sms delivery

## 10.2 Bad retry candidates without guardrails
- destructive DB operations
- inventory writes without idempotency
- duplicate send operations without status checks

## 10.3 Retry rules
- bounded retries
- exponential or stepped backoff
- log each failure
- escalate final failure

---

# 11. Error Handling Standards

Every worker should distinguish:
- retryable failures
- permanent failures
- validation failures
- dependency outages

Final failed jobs should:
- remain inspectable
- be alertable
- include context for replay/manual resolution

---

# 12. Logging Standards

Each job log should include:
- queue name
- job name
- entity id
- user/action source if available
- attempt count
- result
- error details
- timestamps

Use structured logging, not just plain text.

---

# 13. Monitoring Standards

Monitor:
- queue depth
- active jobs
- waiting jobs
- failed jobs
- retry volume
- processing latency
- job age
- worker restarts

Alert on:
- growing backlog
- repeated failures
- stalled jobs
- worker crash loops

---

# 14. Scaling Standards

## 14.1 What should scale horizontally
- workers processing independent jobs

## 14.2 What must be controlled
- DB connection usage
- worker concurrency
- external API rate limits

## 14.3 Scaling rules
- increase concurrency gradually
- measure queue wait times
- measure DB impact
- measure external dependency capacity

---

# 15. Concurrency and Safety

## 15.1 Job concurrency risks
- two workers process conflicting jobs
- a job runs after user changed record state
- inventory gets allocated twice

## 15.2 Controls
- DB state checks
- row locking where necessary
- idempotency keys
- status guards
- queue partitioning if needed

---

# 16. Worker Deployment Standards

Worker service should:
- run separately from web app
- scale independently
- use its own startup command
- share env and queue contracts safely

Recommended Railway service:
- `worker`

Optional:
- multiple worker services by domain if workload grows significantly

---

# 17. Security Standards

Workers need access only to:
- Redis
- Postgres
- storage
- specific external integrations they call

They should not expose public HTTP unless there is a specific reason.

---

# 18. Current App-Specific Worker Plan

For the flooring platform, likely worker jobs include:
- `send-work-order`
- `inventory-sync`
- `generate-work-order-document`
- `notify-work-order-updates`

Recommended split:
- template sync stays synchronous
- send/export becomes async
- post-send side effects become async
- external communication becomes async

---

# 19. Roadmap To Worker Readiness

1. Create shared Redis config
2. Define queues
3. Define payload contracts
4. Create worker runtime
5. Add one job first: `send-work-order`
6. Add monitoring
7. Add retries and idempotency
8. Add remaining jobs incrementally

---

# 20. Reusable Standard For Future Apps

For every future internal app:

1. Decide what must remain synchronous
2. Move only heavy or failure-prone side effects to workers
3. Design jobs around narrow responsibilities
4. Make retries safe
5. Log everything important
6. Monitor queue health before scaling

---

# 21. Document Sections To Keep Updating

Use this file as a living worker standard with these maintained sections:

- worker responsibilities
- queue names
- job contracts
- retry policy
- failure policy
- monitoring setup
- scaling strategy
- known risks
- recovery/replay process

---

If needed, this file should be copied forward into future internal systems and updated per project instead of rewriting worker standards from scratch.
