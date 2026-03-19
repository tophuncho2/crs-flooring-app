# Testing Planning System
## Canonical Home For Test Strategy, Matrices, And Execution Tracking

This folder is the source of truth for testing planning and testing execution in this project.

Use this folder to:
- define how the system should be tested
- decide what coverage is required before work is considered complete
- manage reusable testing standards across domains
- track execution progress as the testing system is brought up to architecture standard

This folder is owned by the testing-management work for the project.
When testing standards change, update the files in this folder first and then update any higher-level plan that links to them.

Do not keep duplicate testing strategy in multiple places.
Other planning files should summarize and point here, not restate these documents in full.

---

# Files In This Folder

## [TESTING_MASTER_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/testing/TESTING_MASTER_PLAN.md)
Canonical testing strategy for the system.

Use for:
- test-layer definitions
- quality gates
- validation philosophy
- workflow testing priorities

## [SIMPLE_TABLE_TEST_MATRIX.md](/Users/ottohull/builderswebapp/builderswebapp/plans/testing/SIMPLE_TABLE_TEST_MATRIX.md)
Reusable coverage template for simple CRUD table domains that use the shared record-panel pattern.

Use for:
- create/edit/delete test expectations
- panel behavior expectations
- route-validation expectations
- copyable pass/fail scenarios for new simple domains

## [TESTING_CHECKLIST.md](/Users/ottohull/builderswebapp/builderswebapp/plans/testing/TESTING_CHECKLIST.md)
Execution checklist for bringing the testing system up to date with the architecture.

Use for:
- sequencing testing work
- tracking shared primitive coverage
- tracking simple-table rollout
- tracking later complex-domain work

## [SIMPLE_TABLE_DOMAIN_STATUS.md](/Users/ottohull/builderswebapp/builderswebapp/plans/testing/SIMPLE_TABLE_DOMAIN_STATUS.md)
Operational board for the current simple-table domains.

Use for:
- seeing what is covered now
- identifying missing route/UI/regression coverage
- keeping the rollout standardized across domains

---

# Update Rules

- Update this folder whenever testing standards or required coverage changes materially.
- Add new testing planning files here only when they have a narrow and durable scope.
- Keep simple-table guidance separate from complex workflow guidance.
- Treat `services` as the reference implementation for simple-table test patterns until a better reference exists.
- If a bug fix changes validation or panel behavior, update the relevant matrix, checklist, or domain status file in this folder.
