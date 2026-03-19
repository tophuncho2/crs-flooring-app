# Prisma Manager
## Canonical Home For Prisma Schema, Migration, And Data-Layer Planning

This folder is the source of truth for planning work centered on Prisma and the database layer.

Use this folder when the work is primarily about:
- editing `prisma/schema.prisma`
- planning or reviewing migrations
- defining table and relation meaning
- checking Prisma connection and environment setup
- coordinating schema work with deploy and release flow

This folder exists so Prisma-related work has one clear planning entrypoint instead of being spread across multiple top-level files.

## Folder Structure

- `README.md`
  Prisma planning index and related-plan entrypoint.
- `assessment/overall-system-schema-assessment.md`
  Current Prisma-manager assessment of schema quality, validation posture, and scalability.
- `assessment/strengths-weaknesses-checklist.md`
  Condensed strengths, risks, and next-step checklist for Prisma management.

---

# Files Connected To Prisma Management

## [../DATA_MODEL_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/DATA_MODEL_PLAN.md)
Business meaning of the core tables and relationships.

Use for:
- ownership rules
- copy vs reference rules
- pricing and derived-value ownership
- deciding whether a schema change matches the real workflow

## [POSTGRES_BLUEPRINT.md](/Users/ottohull/builderswebapp/builderswebapp/plans/prismamanager/POSTGRES_BLUEPRINT.md)
Postgres safety, performance, and production standards.

Use for:
- migration safety
- indexing and query review
- transaction rules
- production database discipline

This is part of Prisma management because Prisma schema and Postgres operating standards must stay aligned.

## [../ENVIRONMENT_VARIABLES_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/ENVIRONMENT_VARIABLES_PLAN.md)
Environment variable planning for app and infrastructure configuration.

Use for:
- `DATABASE_URL`
- direct migration connection strategy
- Prisma runtime config inputs

## [../DEPLOYMENT_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/DEPLOYMENT_PLAN.md)
Deployment, migration, rollback, and release flow.

Use for:
- when migrations should be applied
- review and rollout sequencing
- rollback expectations

## [../RELEASE_READINESS_CHECKLIST.md](/Users/ottohull/builderswebapp/builderswebapp/plans/RELEASE_READINESS_CHECKLIST.md)
Final go-live checklist before production releases.

Use for:
- confirming migration readiness
- checking backup and release gates

## [../BUILD_STANDARDS.md](/Users/ottohull/builderswebapp/builderswebapp/plans/BUILD_STANDARDS.md)
Project-wide engineering rules.

Use for:
- Prisma/database standards
- schema and migration discipline
- documentation expectations after DB changes

---

# Update Rules

- Update this folder when the set of canonical Prisma-planning files changes.
- Update the `assessment/` files when the real schema, validation posture, or migration process changes materially.
- Do not duplicate the full content of the linked plans here.
- Add new Prisma-specific planning files here only when they have a narrow, durable scope.
- Keep this folder focused on Prisma management, not general infrastructure.
