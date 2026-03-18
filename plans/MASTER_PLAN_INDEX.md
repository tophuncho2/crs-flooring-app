# Master Plan Index
## Planning System Entry Point

This file is the main index for the `plans/` folder.

The purpose of `plans/` is to give the project a persistent decision layer that both the owner and Codex agents can use to keep the system:
- safe
- scalable
- efficient
- maintainable
- production-worthy

This folder should be treated as the reference system for the build, not as optional notes.

---

# 1. How To Use This Folder

Before making major changes, review the relevant planning files first.

Use this folder for:
- architecture decisions
- workflow rules
- infrastructure standards
- deployment standards
- testing requirements
- feature definitions
- execution constraints

Use this index to decide where to look.

---

# 2. Core System Planning Files

## [SYSTEM_BLUEPRINT.md](/Users/ottohull/builderswebapp/builderswebapp/plans/SYSTEM_BLUEPRINT.md)
The full reusable system blueprint.

Use for:
- top-level architecture
- folder standards
- service topology
- production goals
- definition of 100%

## [KEY_FEATURES.md](/Users/ottohull/builderswebapp/builderswebapp/plans/KEY_FEATURES.md)
Customer-facing and business-facing feature summary.

Use for:
- understanding the product from the user perspective
- defining the main operational value of the platform

## [SHARED_FEATURES_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/SHARED_FEATURES_PLAN.md)
Shared architecture and reuse strategy.

Use for:
- deciding what should be centralized
- avoiding duplication and drift
- keeping the codebase clean as it scales

## [BUILD_STANDARDS.md](/Users/ottohull/builderswebapp/builderswebapp/plans/BUILD_STANDARDS.md)
Project-wide engineering rules.

Use for:
- architecture standards
- coding boundaries
- mutation safety rules
- frontend/backend expectations

## [CODEX_EXECUTION_GUIDE.md](/Users/ottohull/builderswebapp/builderswebapp/plans/CODEX_EXECUTION_GUIDE.md)
Rules for how Codex should operate inside the repo.

Use for:
- constraining agent behavior
- reducing risky or messy changes
- making future Codex sessions consistent

---

# 3. Product And Domain Planning Files

## [DOMAIN_WORKFLOW_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/DOMAIN_WORKFLOW_PLAN.md)
Defines the true workflow rules of the business.

Use for:
- template lifecycle
- work-order lifecycle
- shortage handling
- completion flow
- resend rules
- inventory allocation flow

## [DATA_MODEL_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/DATA_MODEL_PLAN.md)
Defines the operational meaning of the data model.

Use for:
- understanding what each major table means
- deciding copy vs reference behavior
- planning schema changes safely

## [ANALYTICS_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/ANALYTICS_PLAN.md)
Defines how operational activity becomes reporting and dashboard data.

Use for:
- work-order completion analytics
- cost and revenue reporting rules
- dashboard planning
- deciding when analytics should update

---

# 4. Infrastructure Planning Files

## [POSTGRES_BLUEPRINT.md](/Users/ottohull/builderswebapp/builderswebapp/plans/POSTGRES_BLUEPRINT.md)
Postgres safety, performance, and scalability standard.

## [REDIS_BLUEPRINT.md](/Users/ottohull/builderswebapp/builderswebapp/plans/REDIS_BLUEPRINT.md)
Redis and queue/caching standard.

## [WORKERS_BLUEPRINT.md](/Users/ottohull/builderswebapp/builderswebapp/plans/WORKERS_BLUEPRINT.md)
Worker architecture and background-job standard.

## [RAILWAY_BLUEPRINT.md](/Users/ottohull/builderswebapp/builderswebapp/plans/RAILWAY_BLUEPRINT.md)
Railway service topology and deployment standard.

## [ENVIRONMENT_VARIABLES_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/ENVIRONMENT_VARIABLES_PLAN.md)
Environment variable inventory and ownership.

## [DEPLOYMENT_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/DEPLOYMENT_PLAN.md)
Deployment, migration, rollback, and release flow.

## [SECURITY_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/SECURITY_PLAN.md)
Security baseline for this internal flooring operations platform.

Use for:
- auth and access rules
- secret handling
- route protection
- destructive-action safeguards
- audit logging requirements

## [OBSERVABILITY_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/OBSERVABILITY_PLAN.md)
Logging, monitoring, alerting, and production visibility standard.

Use for:
- structured logs
- error monitoring
- database health visibility
- queue and worker monitoring
- incident readiness

---

# 5. Quality And Readiness Planning Files

## [TESTING_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/TESTING_PLAN.md)
Testing strategy and minimum quality bar.

## [PROJECT_STARTER_CHECKLIST.md](/Users/ottohull/builderswebapp/builderswebapp/plans/PROJECT_STARTER_CHECKLIST.md)
Project setup and restart checklist for this app and future internal apps.

Use for:
- clean repo startup
- local environment setup
- infrastructure setup order
- avoiding messy foundations

## [RELEASE_READINESS_CHECKLIST.md](/Users/ottohull/builderswebapp/builderswebapp/plans/RELEASE_READINESS_CHECKLIST.md)
Final go-live checklist before production releases.

Use for:
- pre-release validation
- migration and backup checks
- infra readiness checks
- final quality gate before shipping

---

# 6. Required Reading By Task Type

## For schema work
Read:
- `DATA_MODEL_PLAN.md`
- `POSTGRES_BLUEPRINT.md`
- `ANALYTICS_PLAN.md`
- `DEPLOYMENT_PLAN.md`

## For frontend/UI work
Read:
- `SYSTEM_BLUEPRINT.md`
- `SHARED_FEATURES_PLAN.md`
- `BUILD_STANDARDS.md`
- `DOMAIN_WORKFLOW_PLAN.md`
- `KEY_FEATURES.md`

## For worker/automation work
Read:
- `WORKERS_BLUEPRINT.md`
- `REDIS_BLUEPRINT.md`
- `RAILWAY_BLUEPRINT.md`
- `DOMAIN_WORKFLOW_PLAN.md`
- `OBSERVABILITY_PLAN.md`

## For infrastructure/deployment work
Read:
- `RAILWAY_BLUEPRINT.md`
- `POSTGRES_BLUEPRINT.md`
- `ENVIRONMENT_VARIABLES_PLAN.md`
- `DEPLOYMENT_PLAN.md`
- `SECURITY_PLAN.md`
- `OBSERVABILITY_PLAN.md`

## For security and access work
Read:
- `SECURITY_PLAN.md`
- `BUILD_STANDARDS.md`
- `ENVIRONMENT_VARIABLES_PLAN.md`
- `DEPLOYMENT_PLAN.md`

## For analytics and reporting work
Read:
- `ANALYTICS_PLAN.md`
- `DATA_MODEL_PLAN.md`
- `DOMAIN_WORKFLOW_PLAN.md`
- `POSTGRES_BLUEPRINT.md`

## For testing and release work
Read:
- `TESTING_PLAN.md`
- `RELEASE_READINESS_CHECKLIST.md`
- `DEPLOYMENT_PLAN.md`
- `OBSERVABILITY_PLAN.md`

## For starting or restarting the project
Read:
- `PROJECT_STARTER_CHECKLIST.md`
- `SYSTEM_BLUEPRINT.md`
- `ENVIRONMENT_VARIABLES_PLAN.md`
- `RAILWAY_BLUEPRINT.md`
- `POSTGRES_BLUEPRINT.md`

## For major Codex-assisted refactors
Read:
- `MASTER_PLAN_INDEX.md`
- `CODEX_EXECUTION_GUIDE.md`
- `BUILD_STANDARDS.md`
- relevant domain/infrastructure files

---

# 7. Rules For Keeping Plans Useful

- update plans when architecture changes materially
- do not leave old plans uncorrected
- do not add planning files without clear scope
- keep plans aligned with the real build
- use plans to reduce ambiguity before coding

---

# 8. Project Goal

The purpose of this planning system is not documentation for its own sake.

The goal is to make sure:
- this project reaches 100% completion with structure
- future internal apps start from a better standard
- Codex and the owner can always refer back to clear rules instead of rebuilding context from scratch

---

This file should always be the first planning file opened in a new session when major project work is about to begin.
