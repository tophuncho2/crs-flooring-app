# Postgres Blueprint
## Efficiency, Safety, Scalability, and Production Standards

This document is a reusable Postgres guide for internal company systems. It is intended to standardize how Postgres is designed, configured, connected, monitored, and scaled across this app and future apps.

It should be treated as a baseline operating standard, not just a database note.

---

# 1. Purpose

Postgres is the operational source of truth for the system.

It is responsible for:
- durable storage
- relational integrity
- transactional correctness
- workflow state persistence
- analytics source data
- auditability foundation

Postgres should never be treated like a simple backing store. It is one of the core architectural layers of the system.

---

# 2. Core Principles

## 2.1 Source of truth
- Postgres is the primary source of truth
- Prisma schema is the schema source of truth
- Migrations are the history of truth

## 2.2 Safety first
- production schema changes must be deliberate
- destructive changes must be reviewed
- backup and restore must be verified
- multi-step domain writes must use transactions

## 2.3 Performance by design
- indexes are required, not optional
- query shapes must be intentional
- large-table access must be paginated
- over-fetching is a production bug

## 2.4 Scalability through discipline
- scale by reducing waste first
- scale by controlling connections
- scale by optimizing hot queries
- scale by moving heavy async work off request cycles

---

# 3. Postgres Role In System Architecture

## 3.1 Layer placement

```text
UI
  ↓
API
  ↓
Domain Services
  ↓
Prisma / Data Access
  ↓
Postgres
```

## 3.2 What should live in Postgres
- entities
- relationships
- workflow states
- snapshots
- transactional truth
- analytics source records
- audit/event records

## 3.3 What should NOT live only in Postgres
- UI-only state
- temporary browser interaction state
- queue transport state if Redis is used
- business rules that are only implicit and not enforced in code

---

# 4. Schema Design Standards

## 4.1 Table design rules
- every table must have a clear business purpose
- avoid catch-all JSON columns unless there is a real need
- use explicit foreign keys
- prefer normalized relational design
- only denormalize when performance or reporting requires it

## 4.2 Required baseline fields
For most operational tables:
- `id`
- `createdAt`
- `updatedAt`

Optional but recommended where useful:
- `createdBy`
- `updatedBy`
- `archivedAt`
- `deletedAt` for soft delete use cases
- `version` if concurrency is important

## 4.3 Relationship rules
- define ownership clearly
- know what deletes with parent and what does not
- never rely on assumed cascade behavior
- document cascade/restrict/null behavior explicitly

## 4.4 Enum rules
- keep enum names stable
- avoid temporary statuses becoming permanent
- review all enums as part of workflow design

## 4.5 Derived data rules
Three acceptable categories:
- persisted operational values
- backend-calculated values
- frontend display-only values

The owner of each derived value must be explicit.

---

# 5. Indexing Standards

Indexes are one of the biggest production differentiators.

## 5.1 Always index
- foreign keys
- heavily filtered columns
- heavily sorted columns
- common composite filter combinations
- columns used in concurrency checks

## 5.2 Typical operational indexes
- parent id columns
- `status`
- `scheduledFor`
- `updatedAt`
- `createdAt`
- unique business identifiers where needed

## 5.3 Composite indexes
Use composite indexes when queries often combine:
- `propertyId + status`
- `status + scheduledFor`
- `parentId + createdAt`
- `parentId + updatedAt`

## 5.4 What not to do
- do not over-index everything blindly
- do not add indexes without understanding write cost
- do not assume Prisma relation fields are always enough

## 5.5 Review process
For every high-traffic table, document:
- most common filters
- most common sorts
- most common joins
- whether table is write-heavy

---

# 6. Query Design Standards

## 6.1 Query rules
- only fetch what the caller needs
- prefer `select` over broad `include`
- avoid loading full related trees by default
- paginate large queries
- avoid full-table scans on operational pages

## 6.2 Pagination rules
Use pagination for:
- lists
- tables
- audit logs
- history views
- analytics rollups

Avoid:
- `take: 250` as a permanent strategy
- loading all options on initial page render when not necessary

## 6.3 N+1 query avoidance
Watch for:
- panels opening child records one-by-one unnecessarily
- per-row lookups inside loops
- repeated option fetches

## 6.4 Query shape review checklist
For any important query, ask:
- is this paginated?
- is this indexed?
- is this fetching too much?
- can this be split or deferred?
- can this be cached safely?

---

# 7. Transactions

## 7.1 When transactions are required
Use transactions for any multi-step workflow where correctness matters:
- template sync
- work-order creation with child rows
- inventory allocation
- analytics updates tied to mutations
- destructive operations that touch multiple tables

## 7.2 Transaction rules
- keep them short
- do not perform external API calls inside them
- do not do long CPU-heavy logic inside them
- do all DB-critical writes atomically

## 7.3 Anti-patterns
- delete then recreate rows without transaction protection
- partially update parent and children separately
- external side effects before DB commit

---

# 8. Concurrency Control

## 8.1 Why it matters
Without concurrency control:
- user A overwrites user B
- sync operations stomp edits
- analytics become stale
- duplicate operational changes happen silently

## 8.2 Recommended strategies
- optimistic concurrency using `updatedAt`
- version column for high-value records
- row locking for hot operational paths

## 8.3 Use optimistic concurrency for
- form saves
- sync operations
- header edits
- panel-based editing

## 8.4 Use row locking when needed for
- inventory allocation
- irreversible state transitions
- hot records with concurrent operational use

---

# 9. Connection Pooling

## 9.1 Why pooling matters
Without pooling:
- app instances exhaust DB connections
- Prisma clients can overwhelm small Postgres plans
- deploy spikes can cause outages

## 9.2 Standard connection model
- pooled URL for app runtime
- direct URL only for migrations/admin tasks if needed

## 9.3 Environment variables
```env
DATABASE_URL=
DIRECT_URL=
```

## 9.4 Pooling rules
- use pooled connection for Next.js runtime
- do not open multiple Prisma clients
- use singleton Prisma client pattern
- understand Railway connection caps before scaling app instances

## 9.5 Common mistakes
- creating Prisma client repeatedly
- running too many parallel loaders
- scaling app replicas without checking connection ceilings

---

# 10. Connection Limits

## 10.1 Why this breaks systems
A healthy app can still fail if too many connections are opened.

## 10.2 Main causes
- too many app instances
- too many worker instances
- no pooling discipline
- long-running transactions
- expensive queries holding connections longer than necessary

## 10.3 Controls
- keep app query volume intentional
- keep workers bounded
- measure concurrent usage
- review connection count after scaling

---

# 11. Write-Heavy Table Design

Certain tables are more likely to grow fast or churn heavily:
- line item tables
- job state tables
- logs
- cut logs
- activity tables
- queue-related metadata later

## 11.1 Rules for write-heavy tables
- index parent ids
- index timeline fields only when necessary
- watch bloat
- avoid unnecessary rewrites
- archive or partition later if growth justifies it

---

# 12. Deletes, Cascades, and Soft Delete Strategy

## 12.1 Questions every table needs answered
- should delete cascade?
- should delete be blocked?
- should rows be soft deleted instead?
- do we need audit history after delete?

## 12.2 Use hard delete when
- data is truly disposable
- no audit/history requirement exists
- no external references depend on it

## 12.3 Use soft delete when
- records are operationally important
- mistakes must be recoverable
- auditability matters
- legal/business history matters

## 12.4 Never guess
Cascade behavior must be reviewed table by table.

---

# 13. Auditing and Change History

## 13.1 Postgres role in auditability
Postgres should support:
- who changed what
- when it changed
- what action occurred
- what entity was affected

## 13.2 Minimum audit targets
- deletes
- status transitions
- sync operations
- inventory allocations
- admin updates
- send/export actions

## 13.3 Storage options
- audit table
- event log table
- dedicated operational history table per domain if necessary

---

# 14. Backup and Restore Standards

## 14.1 Backups are not enough
Backups matter only if restore works.

## 14.2 Minimum standard
- automated backups enabled
- retention period known
- restore drill performed
- restore instructions documented

## 14.3 What to document
- backup provider
- retention
- restore steps
- restore target options
- how to validate restored data

---

# 15. WAL, Durability, and Recovery

## 15.1 What matters
For production, you need confidence that:
- writes are durable
- crash recovery is safe
- replicas or managed recovery modes are understood

## 15.2 What to verify with managed Postgres
- backup coverage
- point-in-time recovery availability if offered
- durability guarantees from provider
- maintenance/restart behavior

---

# 16. Vacuum, Autovacuum, and Table Bloat

## 16.1 Why it matters
Postgres does not automatically stay lean forever.
High update/delete tables can bloat badly.

## 16.2 Watch tables with
- frequent overwrite/delete cycles
- queue-like mutation patterns
- audit/event growth
- child row churn

## 16.3 Operational checks
- autovacuum activity
- dead tuple count
- index growth
- table size trends

## 16.4 When to act
- if table growth is disproportionate
- if queries slow over time
- if dead rows accumulate

---

# 17. Partitioning Guidance

## 17.1 Do not partition too early
Partitioning adds complexity.
Use it only when volume justifies it.

## 17.2 Strong candidates later
- logs
- audit trails
- job history
- very large event tables

## 17.3 Usually not first candidates
- core operational parent tables
- medium-sized entity tables

---

# 18. Read vs Write Scaling

## 18.1 Default approach
Optimize the primary database first.

## 18.2 Add replicas only when
- read load is materially high
- reporting load interferes with operational writes
- analytics queries become expensive enough to isolate

## 18.3 Internal system rule
Most single-company apps should not start with replicas.
They should start with:
- better indexes
- better query design
- less over-fetching
- less unnecessary polling

---

# 19. Monitoring Standards

## 19.1 Required monitoring
- connection count
- slow queries
- lock waits
- CPU
- memory
- disk growth
- dead tuples / bloat signals
- query duration percentiles

## 19.2 Alert-worthy conditions
- connection exhaustion risk
- unusual lock contention
- storage spikes
- backup failures
- sustained slow-query patterns

---

# 20. Security Standards

## 20.1 Secrets
- never commit credentials
- use environment variables only
- rotate if exposed

## 20.2 Access
- production DB access should be limited
- direct SQL access should be controlled
- no local development against prod by default

## 20.3 Migration safety
- review destructive migrations
- apply in staging first
- validate rollback or recovery path

---

# 21. Prisma Integration Standards

## 21.1 Prisma role
Prisma is the application schema layer and ORM abstraction.

## 21.2 Rules
- schema changes through migrations
- no casual `db push` in shared environments
- one Prisma client singleton
- route handlers should not hold business logic
- domain code should own transaction boundaries

## 21.3 Schema review checklist
- are foreign keys correct?
- are indexes present?
- are delete behaviors correct?
- are enums still valid?
- are defaults intentional?

---

# 22. Migration Standards

## 22.1 Development
- use migration files
- review generated SQL
- keep migrations scoped and understandable

## 22.2 Staging and production
- apply via deploy-safe migration commands
- never improvise schema changes manually
- validate schema status after deploy

## 22.3 Before applying migration
- understand data impact
- understand lock impact
- understand rollback or restore plan

---

# 23. Query Review Checklist

For every important page or mutation:

1. Is the query indexed?
2. Is the query fetching only needed columns?
3. Is the query paginated?
4. Is the query called too often?
5. Is the mutation transactional?
6. Is concurrency handled?
7. Will this still be okay at 10x records?

---

# 24. Production Readiness Checklist

Postgres is production-ready when:
- backups are enabled and restore tested
- pooling is configured correctly
- connection limits are safe
- critical queries are indexed
- large tables are paginated
- multi-step writes are transactional
- concurrency risks are handled
- bloat/autovacuum are monitored
- migration process is disciplined
- DB access is secured

---

# 25. Current App-Specific Recommendations

For the current flooring platform, priority database actions should be:

1. Add indexes on:
- work orders
- templates
- item tables
- service item tables
- property parent relations

2. Audit cascade/delete behavior for:
- work orders
- templates
- analytics
- child rows
- inventory-linked rows

3. Extend concurrency protection beyond template sync to:
- work-order header saves
- template saves
- item row edits

4. Reduce over-fetching in page loaders and move more option loading to panel-level or hook-level fetching

5. Prepare Redis and worker infrastructure so heavy DB-adjacent side effects move out of request cycle

6. Add DB operational documentation for:
- migration flow
- backup/restore flow
- index review process
- staging vs production DB rules

---

# 26. Reusable Standard For Future Apps

For every future internal company system:

1. Define the operational truth before building screens
2. Design schema first
3. Add indexes intentionally
4. Treat transactions as a first-class design concern
5. Keep write paths safe before adding polish
6. Add pooling and connection discipline early
7. Add monitoring before scaling
8. Move heavy tasks off the request cycle early
9. Document backup and restore before launch
10. Never treat Postgres as “just storage”

---

# 27. Document Sections To Keep Updating

Use this file as a living Postgres standard with these maintained sections:

- Current provider and topology
- Connection strategy
- Env variables
- Index inventory
- High-risk tables
- Backup/restore status
- Query hot spots
- Concurrency model
- Migration SOP
- Monitoring setup
- Known DB risks

---

If needed, this file should be copied forward into future internal systems and updated per project instead of rewriting database standards from scratch.
