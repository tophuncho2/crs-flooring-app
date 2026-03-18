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
