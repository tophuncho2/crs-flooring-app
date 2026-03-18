# Project Checklist
## Execution Checklist To Reach 100% Completion

This file is a living checklist for the remaining work required to bring this project to 100% completion.

It is intentionally action-oriented.
It is not a blueprint and not a narrative plan.
It is a checklist to execute against.

The order starts with database and Postgres hardening first, because that is one of the highest-risk foundations of the system.

This checklist should be updated as work is completed.

---

# 1. Database / Postgres Hardening


- [ ] Finalize the work-order status model and remove ambiguous or outdated statuses if they are no longer needed.
- [ ] Finalize shortage ownership at both item level and order level.
- [ ] Finalize when analytics should update and what table or domain logic owns that update.
- [ ] Audit all Prisma relations for `Cascade`, `Restrict`, and `SetNull` behavior.
- [ ] Confirm which tables should allow hard delete, which should block delete, and which may need soft delete later.
- [ ] Add all missing indexes for high-frequency lookups and sort patterns.
- [ ] Review current unique constraints and confirm they match real operational rules.
- [ ] Verify the `Property` model/table naming decision and decide whether the `property_hub` table mapping should remain or be cleaned up later.
- [ ] Confirm `Role` enum cleanup plan, since the app logic is simplified but the enum still contains older values.
- [ ] Confirm all material and service pricing fields are stored in the correct tables and not relying on fallback logic.
- [ ] Confirm all copy-vs-reference behavior is correct for template to work-order flows.
- [ ] Add or verify composite indexes for:
  - [ ] `FlooringWorkOrder(propertyId, status)`
  - [ ] `FlooringWorkOrder(scheduledFor)`
  - [ ] `FlooringTemplate(propertyId)`
  - [ ] `FlooringTemplate(templateTag)`
  - [ ] `FlooringWorkOrderItem(workOrderId)`
  - [ ] `FlooringWorkOrderServiceItem(workOrderId)`
  - [ ] `FlooringTemplateItem(templateId)`
  - [ ] `FlooringTemplateServiceItem(templateId)`
  - [ ] `Property(managementCompanyId)`
- [ ] Review Prisma query patterns for N+1 risks and oversized includes.
- [ ] Move any remaining multi-step write flows into explicit transactions.
- [ ] Add stronger concurrency protection for high-risk edits and sync flows.
- [ ] Decide where row-level locking is needed versus optimistic concurrency.
- [ ] Verify Prisma runtime uses the correct pooled `DATABASE_URL`.
- [ ] Verify migrations use the correct direct connection strategy where needed.
- [ ] Verify Railway Postgres backup configuration.
- [ ] Test backup restore procedure against a real snapshot or staging process.
- [ ] Review autovacuum and table-bloat risk for high-write/high-delete tables.
- [ ] Add DB monitoring requirements to the real production rollout.
- [ ] Confirm slow-query visibility exists or has a clear implementation plan.
- [ ] Document the approved schema change process and migration review process.

---

# 2. Workflow Truth / Domain Completion

- [ ] Finalize the work-order lifecycle from `DRAFT` through completion.
- [ ] Finalize resend rules when shortages occur.
- [ ] Finalize the order-level shortage rule and how it is represented in the DB and UI.
- [ ] Finalize inventory allocation timing.
- [ ] Finalize inventory deduction timing.
- [ ] Finalize cut-log creation rules.
- [ ] Finalize generated-file lifecycle:
  - [ ] order slip
  - [ ] picking slip
  - [ ] any other output document
- [ ] Finalize which work-order actions stay synchronous.
- [ ] Finalize which work-order actions move to workers.
- [ ] Finalize sync-template behavior:
  - [ ] overwrite
  - [ ] append
  - [ ] preview/dry run
  - [ ] duplicate-prevention rules
- [ ] Finalize analytics update timing after completion.
- [ ] Finalize whether any calculated fields need to become persisted later.
- [ ] Keep the English schema and workflow docs aligned with the real implementation.

---

# 3. Frontend Architecture And UI System

- [ ] Extract remaining controller-heavy logic from page clients into hooks.
- [ ] Finish shared record controller patterns for templates, work orders, properties, and management companies.
- [ ] Create a consistent shared field-rendering system.
- [ ] Create a consistent shared status-display system.
- [ ] Create shared totals/summary components for templates and work orders.
- [ ] Finish URL-driven linked-record navigation.
- [ ] Add record-panel history behavior and refresh-safe state.
- [ ] Reduce page-level over-fetching and move option loading closer to panels or hooks.
- [ ] Standardize table behavior across modules.
- [ ] Standardize record panel layouts across modules.
- [ ] Standardize child row editing UX for material and service rows.
- [ ] Ensure `Services` is included in:
  - [ ] main navigation header
  - [ ] flooring dropdown navigation
- [ ] Remove any remaining dead or outdated navigation paths.
- [ ] Finish decluttering large client components that still behave like page controllers.
- [ ] Add a dedicated UI/UX planning file for the Airtable-style interaction model.
- [ ] Polish spacing, layout, status display, and interaction consistency.

---

# 4. Backend / Domain Layer Hardening

- [ ] Verify all major flooring routes are thin and delegate to domain/query functions.
- [ ] Remove any remaining route-local business logic.
- [ ] Centralize all core business rules in feature/domain modules.
- [ ] Centralize all calculation helpers:
  - [ ] template totals
  - [ ] work-order totals
  - [ ] analytics totals
- [ ] Remove any remaining fallback pricing behavior that does not match final business rules.
- [ ] Ensure all domain mutations return server truth rather than relying on client assumptions.
- [ ] Add stronger validation coverage across all critical mutation inputs.
- [ ] Review item create/update/delete flows for idempotency and safety.
- [ ] Add audit-event hooks where needed for domain actions.

---

# 5. Redis / Queue / Worker Preparation And Rollout

- [ ] Create shared Redis configuration module.
- [ ] Centralize Redis env parsing and connection ownership.
- [ ] Define queue names and queue prefixes by environment.
- [ ] Finalize job payload contracts for:
  - [ ] send-work-order
  - [ ] inventory-sync
  - [ ] generated-files
  - [ ] any external notification jobs
- [ ] Build worker service runtime.
- [ ] Add BullMQ queue definitions.
- [ ] Add worker processors.
- [ ] Add retry and backoff strategy.
- [ ] Add idempotency guards for worker jobs.
- [ ] Add queue/job logging.
- [ ] Add queue failure monitoring.
- [ ] Add worker deployment/start commands.
- [ ] Move heavy work out of request cycle:
  - [ ] send work order
  - [ ] generated files
  - [ ] inventory fan-out
  - [ ] external syncs
- [ ] Add a dedicated queue/automation planning file for exact ownership between app, BullMQ, and n8n.

---

# 6. Railway / Environment / Deployment Hardening

- [ ] Confirm Railway service topology matches the intended architecture.
- [ ] Verify proper separation for:
  - [ ] web/app service
  - [ ] worker service
  - [ ] postgres-app
  - [ ] redis
  - [ ] n8n services if used
- [ ] Verify private/internal networking is used where appropriate.
- [ ] Verify only required services are publicly exposed.
- [ ] Confirm staging mirrors production closely enough.
- [ ] Verify environment variable ownership by service.
- [ ] Add or verify env validation at app startup.
- [ ] Verify deployment flow for staging.
- [ ] Verify deployment flow for production.
- [ ] Verify migration flow in real deploy conditions.
- [ ] Verify rollback procedure is documented and realistic.
- [ ] Verify build/start commands for every service.
- [ ] Confirm object storage setup if generated files/uploads rely on it.

---

# 7. Security

- [ ] Audit all protected routes and actions.
- [ ] Verify builder-only access boundaries.
- [ ] Verify admin access boundaries.
- [ ] Add or complete audit logging for:
  - [ ] template sync
  - [ ] deletes
  - [ ] status changes
  - [ ] inventory allocations
  - [ ] send/export actions
- [ ] Add destructive-action confirmations where appropriate.
- [ ] Confirm env secret handling is clean and not duplicated.
- [ ] Verify upload/storage constraints if file handling is active.
- [ ] Verify worker security boundaries.
- [ ] Verify Railway/Postgres/Redis operational access is restricted appropriately.
- [ ] Create a role-and-permissions matrix file.

---

# 8. Observability

- [ ] Add structured application logging.
- [ ] Add request IDs.
- [ ] Add user/action context to important logs.
- [ ] Add error monitoring.
- [ ] Add DB health monitoring.
- [ ] Add queue and worker monitoring.
- [ ] Add alerting for critical failures.
- [ ] Add operational visibility for:
  - [ ] sync failures
  - [ ] send failures
  - [ ] shortage-related issues
  - [ ] analytics update failures
- [ ] Add incident response/runbook documentation.

---

# 9. Analytics And Reporting

- [ ] Finalize exact analytics metrics.
- [ ] Finalize what “invoice cost” and revenue-style values mean in the system.
- [ ] Finalize shortage metrics.
- [ ] Finalize completion metrics.
- [ ] Finalize dashboard metric definitions.
- [ ] Verify analytics update logic is correct and consistent.
- [ ] Build analytics/dashboard UI.
- [ ] Validate analytics against real workflow outputs and real data.

---

# 10. Testing

- [ ] Add domain/service tests for core workflow logic.
- [ ] Add API integration tests for critical routes.
- [ ] Add template creation tests.
- [ ] Add template item/service item tests.
- [ ] Add work-order creation tests.
- [ ] Add sync-template tests.
- [ ] Add shortage behavior tests.
- [ ] Add analytics update tests.
- [ ] Add auth/role protection tests.
- [ ] Add destructive action tests.
- [ ] Add queue/job tests once workers are live.
- [ ] Add end-to-end tests for the main operational workflow.
- [ ] Add testing to CI or release gating.

---

# 11. Release And Operational Readiness

- [ ] Run the release readiness checklist against staging.
- [ ] Run the release readiness checklist against production before go-live.
- [ ] Verify backups are real and usable.
- [ ] Verify restore process is tested.
- [ ] Verify rollback process is tested.
- [ ] Verify operational ownership for deploys, DB issues, queue issues, and incidents.
- [ ] Verify logs and alerts are in place before production reliance.
- [ ] Verify production data-change guardrails are in place.

---

# 12. Planning System Completion

- [ ] Add [UI_UX_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans)
- [ ] Add `QUEUE_AUTOMATION_PLAN.md`
- [ ] Add `ROLES_AND_PERMISSIONS_PLAN.md`
- [ ] Add `INCIDENT_RESPONSE_RUNBOOK.md`
- [ ] Update [MASTER_PLAN_INDEX.md](/Users/ottohull/builderswebapp/builderswebapp/plans/MASTER_PLAN_INDEX.md) whenever a new planning file is added.
- [ ] Keep [REMAINING_WORK_TO_100.md](/Users/ottohull/builderswebapp/builderswebapp/plans/REMAINING_WORK_TO_100.md) updated as tasks are completed.
- [ ] Keep [PRISMA_SCHEMA_ENGLISH.md](/Users/ottohull/builderswebapp/builderswebapp/plans/PRISMA_SCHEMA_ENGLISH.md) aligned with schema changes.

---

# 13. Branch / Release Discipline

- [ ] Review branch strategy because `main` is currently far behind active work.
- [ ] Decide the source-of-truth branch for ongoing development.
- [ ] Decide how and when `main` will be reconciled safely.
- [ ] Do not treat production readiness as complete until branch and release discipline are clean.

---

# 14. Definition Of Done For 100%

The project reaches 100% only when:

- [ ] workflow truth is finalized and implemented
- [ ] DB schema is stable and hardened
- [ ] Postgres is safe, monitored, and scalable
- [ ] frontend is modular and polished
- [ ] backend logic is centralized and safe
- [ ] Redis and workers are live and reliable
- [ ] deployment and rollback are disciplined
- [ ] security and auditability are in place
- [ ] observability is real
- [ ] analytics are correct
- [ ] critical workflows are tested
- [ ] the system is trusted operationally by the company
