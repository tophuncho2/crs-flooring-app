# Prisma Manager
## Canonical Home For Schema, Migrations, And Data-Layer Quality

This folder is the source of truth for planning work centered on Prisma and the database layer.

Use this folder when the work is primarily about:
- editing `prisma/schema.prisma`
- planning or reviewing migrations
- defining table and relation meaning
- checking Prisma connection and environment setup
- coordinating schema work with deploy and release flow

Folder structure:
- [README.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Prisma%20Manager/README.md)
- [DATA_MODEL_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Prisma%20Manager/DATA_MODEL_PLAN.md)
- [POSTGRES_BLUEPRINT.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Prisma%20Manager/POSTGRES_BLUEPRINT.md)
- [overall-assessment.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Prisma%20Manager/assessment/overall-assessment.md)
- [strengths-weaknesses.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Prisma%20Manager/assessment/strengths-weaknesses.md)

Connected managers:
- [Platform Manager ENVIRONMENT_VARIABLES_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Platform%20Manager/ENVIRONMENT_VARIABLES_PLAN.md)
- [Platform Manager DEPLOYMENT_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Platform%20Manager/DEPLOYMENT_PLAN.md)
- [Program Manager RELEASE_READINESS_CHECKLIST.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Program%20Manager/RELEASE_READINESS_CHECKLIST.md)
- [Architecture Manager BUILD_STANDARDS.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Architecture%20Manager/BUILD_STANDARDS.md)

Update rules:
- Update this folder when canonical Prisma-planning files change.
- Update the `assessment/` files when schema quality, validation posture, or migration discipline changes materially.
- Keep Prisma-specific planning here and avoid pushing schema decisions back into the root.
