# System Blueprint Template
## Internal Operations Platform
## Single-Company Architecture, Delivery Plan, and Production Standard

This document is a reusable blueprint for building and scaling internal software systems for a single company. It is intended to serve as the starting template for this app and future apps, so each system begins with clean architecture, clear boundaries, safe infrastructure, and a path to 100% completion.

---

# 1. System Purpose

## What this system is
This is an internal operations platform for a single company. It is not a multi-tenant SaaS product. The platform is designed to replace fragmented workflows, spreadsheets, Airtable-like systems, and manual coordination with one structured operational system.

## What this means architecturally
Because this is single-company software:
- the data model can be company-specific
- role structure can be simpler
- workflows can be tightly aligned to real operations
- UX can be optimized for internal speed over public onboarding
- the architecture should still be production-grade and scalable

Even though it is for one company, it still needs:
- safe transactions
- clean schema design
- strong auditability
- scalable database/query patterns
- job processing
- good deployment hygiene
- maintainable code boundaries

---

# 2. Current System Overview

## Current stack
- `Next.js` for frontend and backend delivery
- `Prisma` as ORM and schema source of truth
- `Postgres` as primary database
- `Railway` as hosting/infrastructure platform
- `Redis` planned/partially prepared for queues and job orchestration
- `BullMQ` planned for worker-based business processing
- `n8n` planned for automation/orchestration flows
- `TypeScript` across the application
- feature/domain separation already started

## Current architectural state
The system has already moved beyond an early prototype. It currently includes:
- feature-based organization
- server-only logic extracted from UI
- thin API routes in several core areas
- reusable record panels
- shared material/service row editors
- copy-based template → work-order flow
- analytics support for work orders
- simplified auth model
- better domain separation than the original version

## Current core business modules
- users
- properties
- management companies
- products
- manufacturers
- categories
- units of measure
- templates
- template material items
- template service items
- work orders
- work-order material items
- work-order service items
- inventory
- warehouses
- sections
- locations
- imports
- cut logs
- analytics

## Current workflow model
Templates are reusable configurations.
Work orders are operational records created from templates or forms.

Current rule:
- template data is copied into work-order tables
- work orders are independent after creation
- no live linkage remains after sync/copy

That is the correct model for this app.

---

# 3. Current Functional Architecture

## Frontend
The frontend is a record-based internal database UI using:
- table views
- record panels
- row editors
- linked-record opening patterns
- shared child editors for material/service rows

## Backend
The backend currently handles:
- validation
- domain mutations
- database access
- API route entrypoints
- work-order/template sync logic
- analytics recalculation

## Database
Postgres is the source of truth.
Prisma schema is the canonical schema definition.

## Current runtime model
- one Next.js app handles UI + API
- worker service is planned but not yet fully active
- Redis is planned for job/queue infrastructure
- n8n is planned for higher-level automation workflows

---

# 4. Current Folder Structure Pattern

This is the target baseline pattern for internal company systems using one main Next.js app.

```text
app/
  api/
  dashboard/
  login/

features/
  flooring/
    products/
    templates/
    work-orders/
    properties/
    management-companies/
    services/
    shared/

server/
  auth/
  db/
  flooring/
  http/
  platform/
  queues/
  storage/

prisma/
  schema.prisma
  migrations/

public/

workers/                # future worker runtime
docs/                   # architecture, SOPs, runbooks
scripts/                # one-off scripts
```

## What each area is for

### `app/`
Delivery layer only.
Contains:
- pages
- layouts
- route handlers
- page entrypoints

Should not contain:
- heavy domain logic
- deep business calculations
- database orchestration beyond calling domain/query functions

### `features/`
Domain-oriented application code.
Contains:
- UI components for each domain
- queries
- mutations
- validators
- domain services
- record panels
- shared domain UI

This is where most app-specific business behavior should live.

### `server/`
Server-only infrastructure and platform logic.
Contains:
- auth
- Prisma client
- http helpers
- Redis config
- queue config
- storage integrations
- platform access logic

This should never leak into browser bundles.

### `prisma/`
Database truth.
Contains:
- schema
- migrations
- seed logic

### `workers/`
Future separate runtime for BullMQ processors and async jobs.

### `docs/`
Must contain:
- architecture notes
- deployment SOP
- migration SOP
- backup/restore SOP
- queue/worker SOP
- onboarding guide

---

# 5. Current Strengths

## What is already good
- the system is feature-oriented now instead of being one monolithic route tree
- backend logic is cleaner than early CRUD-style implementations
- template/work-order copy semantics are now aligned to the business
- sync flow is safer than before
- the UI is moving toward reusable database-style patterns
- Prisma is the schema source of truth
- auth is simpler and easier to reason about
- the app is already beyond a toy system

---

# 6. Current Weaknesses

## What is still incomplete
- page clients still hold too much controller logic
- nested linked-record navigation is not fully URL-driven
- workers are not fully implemented
- Redis integration is not fully formalized
- observability is weak
- audit logging is missing
- test coverage is still low
- database indexing and performance hardening are incomplete
- UI polish is still mid-stage
- option loading still over-fetches in some modules

---

# 7. Full System Architecture

## Target architecture at 100%

```text
Browser
  ↓
Next.js Web App
  ↓
API / Route Layer
  ↓
Feature Domain Layer
  ↓
Prisma / Database Access Layer
  ↓
Postgres

User Action
  ↓
API Mutation
  ↓
Domain Service
  ↓
Immediate DB Transaction
  ↓
Optional Queue Trigger
  ↓
Redis
  ↓
BullMQ Worker Service
  ↓
External side effects / document generation / sends / syncs

Automation Trigger
  ↓
n8n
  ↓
API / Webhook / Queue Trigger
  ↓
App Domain Logic
```

## Responsibilities by layer

### Browser / Client UI
Responsible for:
- rendering
- local interaction state
- panel state
- editing state
- calling APIs

Not responsible for:
- business truth
- pricing rules
- sync rules
- inventory rules
- transactional correctness

### Next.js Page Layer
Responsible for:
- route delivery
- auth gating
- initial page bootstrapping
- invoking domain queries

Not responsible for:
- shaping huge custom DTOs inline forever
- business logic
- sync logic
- stateful orchestration

### API Layer
Responsible for:
- auth
- validation
- calling domain services
- returning structured responses

Not responsible for:
- holding business logic inline
- direct page-specific state shaping

### Domain Layer
Responsible for:
- business rules
- sync behavior
- calculations
- transaction boundaries
- workflow state rules
- domain validation

This is the heart of the system.

### Database Layer
Responsible for:
- persistence
- referential integrity
- transactional correctness
- durable storage

### Queue / Worker Layer
Responsible for:
- heavy async processing
- retries
- fan-out tasks
- send/export tasks
- inventory sync tasks
- document generation
- notifications

### n8n Layer
Responsible for:
- orchestration
- external workflow automation
- integration chains
- scheduled flows
- webhook-based process control

---

# 8. Current and Future Service Connections

## Current connections
- `Next.js app -> Postgres`
- `Next.js app -> Prisma`
- `Next.js app -> auth/session layer`
- `Next.js app -> S3/storage service` if configured
- `Next.js app -> internal API routes`

## Planned near-term connections
- `Next.js app -> Redis`
- `Next.js app -> BullMQ queue producers`
- `Worker service -> Redis`
- `Worker service -> Postgres`
- `n8n -> app APIs/webhooks`
- `n8n -> Redis` if needed for queue mode
- `n8n -> separate Postgres` if self-hosted persistently

## Target service topology
- `web/app service`
- `worker service`
- `postgres`
- `redis`
- `n8n main`
- `n8n worker` if queue mode is used
- `object storage`

---

# 9. Database Architecture Standard

## Database role
Postgres is the operational source of truth.

## Rules
- Prisma schema is canonical
- all schema changes go through migrations
- no production `db push`
- all multi-step writes use transactions
- all critical workflows must be replayable from schema + migrations

## Core database design rules
- use explicit foreign keys
- use indexes on high-traffic filters and joins
- audit cascade behavior
- prefer normalized relational design
- persist operational truth, not UI-only convenience
- derived fields may exist, but must be clearly owned

---

# 10. Postgres Configuration Standard

## Minimum production requirements
- automated backups enabled
- restore process tested
- connection pooling configured
- connection limits understood
- autovacuum active
- slow-query visibility enabled
- disk usage monitored
- CPU and memory monitored

## Recommended Prisma/Postgres env vars
```env
DATABASE_URL=
DIRECT_URL=
```

## Usage rules
- `DATABASE_URL`: pooled runtime connection
- `DIRECT_URL`: direct connection for migrations if needed

## Query safety rules
- use `select` where possible
- avoid unnecessary `include`
- paginate large tables
- avoid loading huge option datasets by default
- use transactions for multi-step mutations
- use optimistic concurrency or row locking where concurrent edits matter

## Indexing baseline
At minimum, index:
- foreign keys
- sort columns
- status columns
- date columns
- frequently filtered parent ids

Examples:
- `workOrder.propertyId`
- `workOrder.status`
- `workOrder.scheduledFor`
- `workOrder.updatedAt`
- `template.propertyId`
- `template.updatedAt`
- `workOrderItem.workOrderId`
- `workOrderServiceItem.workOrderId`
- `templateItem.templateId`
- `templateServiceItem.templateId`
- `property.managementCompanyId`

## Concurrency baseline
Use one of:
- `updatedAt` optimistic check
- version column
- row-level locking for the most sensitive flows

## Bloat-risk tables
Watch closely:
- work-order item tables
- template item tables
- cut logs
- login activity tables
- queue/job state tables later

---

# 11. Redis Configuration Standard

## Redis role
Redis should not hold business truth.
Redis should support:
- BullMQ queues
- locks
- short-lived cache
- idempotency helpers if needed

## Rules
- one Redis per environment
- queue prefixes per environment
- no production Redis reuse in dev
- centralize connection config

## Recommended env vars
```env
REDIS_URL=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
QUEUE_PREFIX=
```

## Recommended structure
```text
server/queues/
  redis.ts
  config.ts
  jobs/
  contracts/
```

---

# 12. Worker Architecture Standard

## Worker responsibilities
Workers should process:
- send-work-order
- document generation
- inventory sync
- notifications
- external syncs
- long-running calculations if necessary

## Worker should NOT handle
- basic create/edit flows
- fast template → draft work-order copy
- normal UI-triggered transactional edits

## BullMQ design standard
```text
workers/
  index.ts
  processors/
    send-work-order.ts
    inventory-sync.ts
    document-generate.ts

server/queues/
  redis.ts
  queues.ts
  jobs/
    send-work-order.ts
    inventory-sync.ts
    template-to-work-order.ts
```

## Queue rules
- stable queue names
- typed payload contracts
- retries/backoff defaults
- failure logging
- dead-letter strategy

---

# 13. n8n Architecture Standard

## n8n role
n8n is for orchestration and cross-system automation.

Use n8n for:
- scheduled workflows
- external system handoffs
- email automation chains
- notifications across systems
- webhook-driven orchestration

Do not use n8n as the primary place for:
- core business rules
- transactional domain truth
- pricing rules
- inventory truth

Those belong in the app backend.

---

# 14. API Architecture Standard

## API route rule
Every route should follow this pattern:

```ts
auth
→ validate input
→ call domain/query function
→ return response
```

## API should not do
- business logic inline
- pricing logic inline
- sync logic inline
- item transformation logic duplicated per route

## Domain folders should look like
```text
features/<domain>/
  queries.ts
  mutations.ts
  validators.ts
  services.ts
  domain/
```

---

# 15. Frontend Architecture Standard

## Target frontend model
The UI should feel like a connected internal database.

### Core behaviors
- table view of records
- click row → open record panel
- linked records open related panels
- child rows editable inline
- forms are reusable
- navigation is light and fast

## What should be shared
- record panel shell
- linked-record navigation
- field components
- material row editor
- service row editor
- loading/error handling hooks
- child collection hooks
- table controls

## What should stay domain-specific
- field order
- business actions
- labels
- tabs
- section grouping
- workflow action buttons

## Target frontend pattern
```text
features/<domain>/components/
features/<domain>/hooks/
features/shared/
  record-panel
  row-editors
  fields
  table-shell
  notices
  child-collection hooks
```

---

# 16. Auth and Access Standard

## For single-company systems
Prefer simple role models.

Recommended baseline:
- `BUILDER`
- `ADMIN`

Optional later:
- `OPS`
- `WAREHOUSE`
- `READ_ONLY`

## Rules
- role checks should be simple and explicit
- avoid complex email-based special casing
- avoid fake subscription/access abstractions unless truly needed

---

# 17. Observability Standard

## Must have
- structured server logs
- request id
- user id where appropriate
- error monitoring
- DB health monitoring
- queue/job monitoring
- deployment visibility

## Audit logging must cover
- template sync
- row deletes
- status changes
- send/export actions
- inventory allocations
- admin changes

---

# 18. Testing Standard

## Minimum production test coverage
- login/auth flow
- create template
- create template items
- create work order
- sync template to work order
- update work-order rows
- destructive action protections
- core status transitions

## Test levels
- domain/service tests
- API integration tests
- UI flow tests
- end-to-end workflow tests

---

# 19. Deployment Standard

## Environments
- local
- staging
- production

## Rules
- staging mirrors production topology
- separate DB and Redis per environment
- separate storage buckets where possible
- no prod creds in local
- no direct production experiments

## Railway structure
Recommended services:
- `web`
- `worker`
- `postgres-app`
- `redis`
- `n8n-main`
- `n8n-worker`
- `postgres-n8n`

---

# 20. Security Standard

## Must have
- secrets never committed
- env validation on boot
- protected admin routes
- protected destructive actions
- audit logs
- clear role model
- safe file upload constraints
- backup/restore readiness

---

# 21. Current Completion Snapshot

## Current estimated status
- core business model: solid but not finished
- Prisma/data model: mostly real
- backend/domain structure: good foundation
- API quality: decent and improving
- frontend architecture: mid-stage
- UI polish: incomplete
- workers: not yet live
- Redis: not fully integrated
- observability: weak
- tests: weak
- production hardening: incomplete

Approximate overall completion:
- **55% complete**

---

# 22. Roadmap To 100%

## Phase 1: Stabilize
- finalize status model
- finish sync safety
- add `Services` to nav
- add indexes
- fix remaining controller-heavy client logic
- add baseline tests

## Phase 2: Harden
- env validation
- audit logging
- structured logs
- reduce over-fetching
- complete controller hook extraction
- improve linked-record architecture

## Phase 3: Scale
- add Redis config layer
- implement BullMQ
- create worker service
- move heavy jobs off request cycle
- improve DB monitoring and concurrency handling

## Phase 4: Polish
- refine record panels
- improve URL-driven navigation
- improve table UX
- finish Airtable-like interaction quality
- add dashboards/analytics views

## Phase 5: Production maturity
- full test coverage for critical workflows
- full runbooks
- restore-tested backups
- queue monitoring
- deployment discipline
- final cleanup and documentation

---

# 23. Definition of 100% Completion

A system is considered 100% complete when:

## Product
- all intended operational workflows are supported
- workflows match real company process

## Architecture
- business logic is centralized
- UI is modular and reusable
- routes are thin
- data loading is controlled

## Database
- schema is stable
- indexes are correct
- transactions are safe
- concurrency is handled
- backups and restore are verified

## Infrastructure
- staging and production are clean
- pooling and limits are safe
- Redis and workers are reliable
- monitoring is active

## UX
- fast, clear, and consistent
- linked records work naturally
- large tables remain usable

## Operations
- logs exist
- alerts exist
- audit trail exists
- runbooks exist

## Quality
- critical flows are tested
- deploys are predictable
- failures are diagnosable
- the app can be extended without architectural drift

---

# 24. Reusable Build Standard For Future Apps

For future single-company internal systems, start with this baseline:

1. Define the operational source of truth first.
2. Design schema around real workflows, not screens.
3. Use Prisma as schema truth.
4. Keep Next.js pages thin.
5. Put business logic in domain modules.
6. Keep frontend reusable and record-based.
7. Add Redis and workers early, even if jobs come later.
8. Treat Postgres like production infra from day one.
9. Add audit logging before the app becomes operationally critical.
10. Never let page-level shortcuts become permanent architecture.

---

# 25. Recommended Document Sections To Keep Updating

Use this document as a living template with these maintained sections:

- System Purpose
- Business Workflow Summary
- Current Status
- Architecture Overview
- Folder Structure
- Environment Variables
- Database Design Notes
- Queue/Worker Design
- Navigation Model
- Deployment Model
- Testing Status
- Known Risks
- Next Priorities
- Definition of Done

---

If needed, this file should be copied forward into future internal company systems and updated per project, rather than rewritten from scratch each time.
