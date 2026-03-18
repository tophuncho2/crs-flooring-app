# Observability Plan
## Logging, Metrics, Monitoring, Alerts, And Operational Visibility

This file defines the observability expectations for the flooring operations platform.

The goal is to make the system diagnosable, measurable, and supportable in production.

---

# 1. Purpose

Observability must answer:
- what failed
- where it failed
- who triggered it
- which record was affected
- whether the system is healthy
- whether work is backing up

Without observability, production issues become guesswork.

---

# 2. Current State

Current strengths:
- the codebase is becoming cleaner and easier to instrument
- major workflow boundaries are becoming more explicit

Current weaknesses:
- no formal structured logging layer yet
- no central queue monitoring yet
- limited DB health visibility in app context
- limited audit/event tracking

---

# 3. Logging Standards

## 3.1 Application logs should include
- request id
- user id or email when available
- action name
- record id
- route/module context
- error message
- timestamp

## 3.2 Important events to log
- login attempts
- template sync attempts
- work-order saves
- deletes
- shortage detection
- completion actions
- future send/export actions

## 3.3 Log style
Prefer structured logs over ad hoc console output.

---

# 4. Error Monitoring

The system should have visibility into:
- route failures
- domain exceptions
- worker failures
- queue retry storms
- DB connection failures
- storage failures

At minimum, errors should be:
- captured
- attributable
- searchable

---

# 5. Database Monitoring

Track:
- connection count
- slow queries
- lock waits
- query duration
- dead tuples / bloat signals
- CPU/memory/storage pressure

Important for this app because:
- work-order and template workflows are central
- future inventory and worker processing will increase DB pressure

---

# 6. Worker And Queue Monitoring

When workers are added, monitor:
- queue depth
- active jobs
- waiting jobs
- failed jobs
- retry count
- job latency
- stalled jobs

This is especially important for:
- send-work-order
- inventory-sync
- file generation

---

# 7. User-Facing Operational Visibility

The system should eventually provide useful user-facing operational feedback for:
- shortage status
- sync conflicts
- send/export processing
- failed processing actions
- completion readiness

This is not a replacement for logs, but it is important for real operations.

---

# 8. Alerting Standards

Alert-worthy conditions include:
- repeated route failures
- DB connection pressure
- worker crashes
- large queue backlog
- high retry volumes
- failed send/export actions
- failed backups if surfaced via infrastructure

---

# 9. Auditability vs Observability

These are related but not the same.

## Observability answers
- what is happening in the system
- whether it is healthy
- where it is failing

## Auditability answers
- who did what
- when it happened
- what record changed

Both are needed.

---

# 10. Current Project-Specific Priorities

Highest-priority observability improvements:

1. structured backend logging
2. request identifiers
3. key action logs for template/work-order flows
4. DB performance visibility
5. worker/queue visibility once workers are live
6. shortage and send-failure event tracking

---

# 11. Definition Of Success

Observability is successful when:
- production failures are diagnosable quickly
- queue issues are visible
- DB health issues are visible
- important operational events are traceable
- support and debugging do not depend on guessing

---

This file should be updated as the monitoring stack and runtime visibility evolve.
