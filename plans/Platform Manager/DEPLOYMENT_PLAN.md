# Deployment Plan
## Local, Staging, Production, Migration, Rollback, And Release Standards

This file defines how the system should be deployed and promoted safely.

---

# 1. Purpose

Deployments must be:
- predictable
- safe
- reversible where possible
- documented

---

# 2. Environments

- local
- staging
- production

Rules:
- staging mirrors production topology
- no production data for local by default
- no shared prod/staging Redis or DB

---

# 3. Deployment Flow

Recommended flow:

1. local development
2. local validation
3. staging deploy
4. migration application
5. staging smoke test
6. production deploy
7. production verification

---

# 4. Migration Flow

Rules:
- review migrations before deploy
- apply in staging first
- apply with deploy-safe commands
- verify schema status after migration

---

# 5. Rollback And Recovery

Every major deploy should have:
- rollback understanding
- restore plan for DB if required
- worker/job recovery plan if jobs are affected

---

# 6. Release Checklist

Before release:
- build passes
- lint passes or accepted warnings understood
- migrations reviewed
- env vars verified
- backups verified
- critical flows tested

---

# 7. Definition Of Success

Deployment is successful when:
- deploys are repeatable
- failures are diagnosable
- DB changes are controlled
- staging and production remain aligned

---

This file should be updated as the deployment flow matures.

---

# 8. Current Safe Merge Plan

For the current `staging` to `production` promotion:

1. Confirm branch shape
- verify `staging` is clean
- verify `main` has not advanced unexpectedly
- prefer fast-forward promotion of the tested `staging` commit instead of a manual cherry-pick set

2. Validate before staging deploy
- `npm test`
- `npm run build`
- confirm Prisma migration set is reviewed

3. Deploy to staging
- deploy the current `staging` commit
- run `npx prisma migrate deploy`
- verify application boot, auth, and dashboard layout render successfully

4. Run staging smoke pass
- login flow
- header navigation and user menu
- warehouse sections and locations
- imports create/edit/delete restriction behavior
- inventory grouping, open/edit/delete, cut logs, location reassignment
- templates create/edit/delete and child item behavior
- work-order create flow and template sync flow

5. Production promotion
- only promote the exact staging-tested commit
- apply `npx prisma migrate deploy` in production
- run a focused production smoke pass immediately after deploy

6. Rollback posture
- code rollback is easy only if no newer commit is mixed in
- database rollback is not assumed safe for this release because multiple migrations are additive and restrictive
- recovery posture should be:
  - verify backups first
  - stop at staging if migration behavior is not clean
  - do not promote partial schema uncertainty into production

Current release notes:
- current local branch delta from `main` includes shared table architecture changes, new route auth/server structure, dashboard shell changes, and many data model changes
- treat this as a release train, not as a small patch
