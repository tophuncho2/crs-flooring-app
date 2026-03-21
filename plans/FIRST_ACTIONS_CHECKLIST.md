# First Actions Checklist
## Root Execution Checklist For Reaching Worker-Readiness

This file is the root execution track for the phased assessment.
Completing the checklist below is how the project moves through the phases in `ASSESSMENT_TO_100_PERCENT.md`.

When the remaining items below are complete, the app should be ready to start worker implementation.

---

# Current Pre-Worker Solidification Checklist

- [ ] Lock the final permissions matrix for `ADMIN` vs `BUILDER` and apply the same capability rules consistently across all protected routes.
- [ ] Extend structured request-id logging and audit events from auth/admin/upload flows into the core flooring mutation routes.
- [ ] Configure Railway `REDIS_URL` in staging and production so rate limiting is shared across replicas instead of process-local fallback only.
- [ ] Finish workflow truth for work-order statuses, shortages, resend/reprocess rules, completion, and analytics timing.
- [ ] Expand regression coverage for permissions, destructive actions, shortage/completion behavior, and workflow handoff rules.
- [ ] Run and document a repeatable staging-to-production release checklist with app, DB, and smoke-test gates before worker rollout.

---

# Phase 1. Security And Access Containment

- [x] Lock down public registration so unauthenticated users cannot create privileged accounts.
- [ ] Define the canonical permissions matrix for `ADMIN`, `BUILDER`, and any narrower operational roles.
- [x] Tighten builder/admin governance so account creation and verification behavior are explicit and controlled.
- [x] Add rate limiting to login, registration, uploads, and sensitive write endpoints.
- [x] Add startup env validation so missing or malformed platform secrets fail fast.

---

# Phase 2. Workflow Truth Lock

- [ ] Define the canonical work-order lifecycle from creation through completion.
- [ ] Define the shortage lifecycle, including when shortages are created, cleared, surfaced, and preserved.
- [ ] Define resend and reprocess rules for work orders once they have been prepared or sent.
- [ ] Lock the template-sync rule set for overwrite, merge, and approved edit behavior.
- [ ] Define completion rules and exactly when analytics should update.
- [ ] Define the future worker contract in plain language without implementing worker code yet.

---

# Phase 3. Data And Operational Alignment

- [x] Align warehouse section/location behavior with the Prisma schema and remove legacy drift.
- [x] Move the inventory table onto the configurable table-controls system so `section` is a true groupable and hideable field while `location` remains the worker-facing location selector.
- [ ] Audit remaining schema/runtime/legacy drift in inventory, templates, work orders, imports, and analytics-adjacent flows.
- [ ] Verify that worker-relevant operational fields are stored, exposed, and mutated consistently across schema, API, and UI.
- [ ] Standardize manager update discipline so each thread keeps its own `README`, assessment, and next actions current after real project changes.

---

# Phase 4. Test And Release Safety

- [x] Add direct shared CRUD primitive tests and standardize the simple-table client harness.
- [x] Expand automated tests around template sync, work-order mutation flows, and destructive protections.
- [x] Add auth and permission coverage for protected write routes.
- [ ] Add regression coverage for shortage behavior, completion behavior, and analytics handoff after workflow truth is locked.
- [ ] Run the Program Manager checklist against the current repo state and mark what is already complete versus still assumed.

---

# Phase 5. Worker Readiness Gate

- [ ] Decide the worker rollout boundary: what stays synchronous and what moves to BullMQ.
- [ ] Define worker inputs, outputs, retries, idempotency rules, and failure surfacing.
- [ ] Define allocation ownership, file-generation ownership, and statistics-generation ownership for worker-era processing.
- [ ] Define the minimum observability required before workers are allowed to go live.
- [ ] Confirm the app has completed the earlier phases tightly enough to begin worker implementation.
