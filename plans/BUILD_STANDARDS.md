# Build Standards
## Engineering Rules For A Safe, Scalable, Maintainable Internal Platform

This file defines the core engineering standards for the project.

It is meant to prevent drift, reduce architecture mistakes, and ensure the system remains clean as it grows.

---

# 1. Core Goal

The system must be:
- safe
- scalable
- efficient
- maintainable
- production-worthy

This applies to:
- frontend
- backend
- database
- workers
- infrastructure

---

# 2. Architecture Standards

## 2.1 Separation of concerns
The app must preserve clear boundaries between:
- delivery layer
- UI layer
- domain layer
- database layer
- queue/worker layer
- infrastructure config

## 2.2 Thin routes
API routes should:
- authenticate
- validate input
- call domain/query functions
- return response

Routes should not contain business logic.

## 2.3 Domain ownership
Business rules belong in:
- `features/<domain>/services.ts`
- `features/<domain>/mutations.ts`
- `features/<domain>/domain/*`

## 2.4 Shared patterns
Repeated UI and state behavior should become shared when it appears across multiple modules.

---

# 3. Folder Standards

## 3.1 `app/`
Use for:
- routes
- layouts
- delivery entrypoints

Do not use for:
- deep domain logic
- heavy orchestration

## 3.2 `features/`
Use for:
- domain code
- UI for domains
- validators
- mutations
- queries
- domain services

## 3.3 `server/`
Use for:
- auth
- db
- http helpers
- queue config
- storage
- platform config

## 3.4 `prisma/`
Use for:
- schema
- migrations
- seed scripts

## 3.5 `workers/`
Use for:
- async processors
- worker runtime only

---

# 4. Frontend Standards

## 4.1 Page clients should not become controllers forever
UI files should primarily render.

Heavy orchestration should move into:
- hooks
- shared controllers
- domain query/mutation helpers

## 4.2 Shared UI requirements
Repeated UI behavior should become shared:
- record panels
- row editors
- field wrappers
- notices
- table behavior
- linked-record opening

## 4.3 Record model
The UI should behave like a connected internal database:
- table view
- open record panel
- linked record opening
- reusable form/editor patterns

## 4.4 No giant one-off feature files
When a client grows too large, split it into:
- panel
- controller hook
- child collection hooks
- subcomponents

---

# 5. Backend Standards

## 5.1 Business rules live in the backend
The frontend can assist UX, but backend owns truth.

## 5.2 Transactions
Any multi-step workflow with correctness requirements must use a transaction.

## 5.3 Concurrency
Important writes should use:
- optimistic concurrency
- or explicit locking where needed

## 5.4 Server truth over client assumptions
Do not trust client-side counts, totals, or summary updates as final truth.

---

# 6. Prisma And Database Standards

## 6.1 Schema source of truth
Prisma schema is canonical.

## 6.2 Migration discipline
- use migrations
- review migration impact
- no casual production schema pushes

## 6.3 Indexing discipline
Add indexes intentionally for:
- foreign keys
- hot filters
- sort fields
- concurrency fields

---

# 7. Worker And Queue Standards

## 7.1 Synchronous vs asynchronous
Keep fast transactional operations synchronous.
Move heavy, retryable, external, or fan-out operations to workers.

## 7.2 Queue discipline
Jobs must have:
- clear payloads
- retry rules
- idempotency expectations
- logging

---

# 8. Configuration Standards

## 8.1 Centralize runtime config
Config must not be scattered.

## 8.2 Environment variables
All env vars should be:
- documented
- named consistently
- validated on boot

## 8.3 Service boundaries
Service URLs, queue names, storage config, and DB connection rules should be centralized.

---

# 9. Logging And Audit Standards

## 9.1 Logging
Important server actions should use structured logs.

## 9.2 Audit events
Add audit events for:
- syncs
- deletes
- sends
- status changes
- admin changes

---

# 10. Quality Standards

## 10.1 Lint must stay green except explicitly accepted warnings
## 10.2 Build must pass
## 10.3 Critical workflows need tests
## 10.4 Refactors must update all call sites
## 10.5 Dead code should not be left behind

---

# 11. Safety Rules

- never leave destructive behavior implicit
- never rely on stale client state for correctness
- never duplicate business rules casually
- never mix local experimentation with production assumptions
- never leave schema/infra changes undocumented

---

# 12. Definition Of Success

These standards are successful when:
- new features fit the architecture cleanly
- files stay understandable
- duplication trends downward
- business rules stay centralized
- infrastructure stays predictable

---

This file should be referenced before major implementation work and updated when engineering standards materially evolve.
