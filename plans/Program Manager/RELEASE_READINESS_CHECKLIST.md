# Release Readiness Checklist
## Final Gate Before Production-Or-Production-Like Release

This file is the final checklist used before calling the system production-ready or shipping a major release.

---

# 1. Application Readiness

- build passes
- lint passes or accepted warnings are documented
- critical routes work
- critical workflows work
- no known critical data-loss paths remain

---

# 2. Database Readiness

- migrations reviewed
- migrations tested in staging
- indexes reviewed
- backups verified
- restore process understood
- connection strategy verified

---

# 3. Infrastructure Readiness

- staging mirrors production
- env vars are complete
- secrets are correct
- Railway services are correct
- Redis isolation is correct
- worker deployment is correct if used

---

# 4. Security Readiness

- auth rules reviewed
- destructive actions protected
- audit logging in place for critical flows
- secrets not exposed

---

# 5. Observability Readiness

- logs available
- important errors visible
- DB health visible
- queue/worker health visible if used
- alert path known

---

# 6. Workflow Readiness

- template workflow verified
- work-order workflow verified
- sync workflow verified
- shortage behavior verified if implemented
- completion behavior verified
- analytics updates verified

---

# 7. Operational Readiness

- deployment steps documented
- rollback path known
- restore path known
- known risks documented
- next-phase work does not block release safety

---

# 8. Definition Of Success

Release readiness is successful when:
- the system is safe to operate
- failures are diagnosable
- deploys are controlled
- workflows match expected business behavior

---

This file should be used as the final gate before major releases and updated as the system matures.

---

# 9. Current Staging To Production Gate

Current local branch state on March 19, 2026:
- `staging` is a fast-forward ahead of local `main`
- delta from `main` is large: `361 files changed, 35360 insertions, 16090 deletions`
- current local validation passed:
  - `npm test` -> `39` files, `197` tests passed
  - `npm run build` passed

Current release risk profile:
- schema and migration risk is high because the release includes `18` new Prisma migrations after the baseline
- workflow risk is medium-high because imports, inventory, templates, work orders, warehouse, and header shell behavior all changed
- merge-conflict risk is currently low only if production is still at local `main`

Required promotion gate for this release:
- deploy `staging` first
- run deploy-safe Prisma migrations in staging
- manually smoke test:
  - login and dashboard header hydration
  - warehouse sections and locations
  - imports create, edit, delete restriction
  - inventory open, edit, cut logs, location change
  - templates create, edit, delete, child items
  - work-order create, template sync, record-panel notices
  - grouping, columns, search, sort on the shared table pages
- verify no staging-only env or data assumptions surfaced
- only then promote the exact tested `staging` commit to production

Do not call this release production-safe unless the staging migration and the staging smoke pass are both complete.
