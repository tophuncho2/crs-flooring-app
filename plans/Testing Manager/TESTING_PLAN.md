# Testing Plan
## Legacy Entry Point To The Canonical Testing Planning System

The canonical home for testing planning now lives under [`plans/Testing Manager/`](/Users/ottohull/builderswebapp/builderswebapp/plans/Testing%20Manager).

Start there:
- [`README.md`](/Users/ottohull/builderswebapp/builderswebapp/plans/Testing%20Manager/README.md)
- [`TESTING_MASTER_PLAN.md`](/Users/ottohull/builderswebapp/builderswebapp/plans/Testing%20Manager/TESTING_MASTER_PLAN.md)
- [`SIMPLE_TABLE_TEST_MATRIX.md`](/Users/ottohull/builderswebapp/builderswebapp/plans/Testing%20Manager/SIMPLE_TABLE_TEST_MATRIX.md)
- [`TESTING_CHECKLIST.md`](/Users/ottohull/builderswebapp/builderswebapp/plans/Testing%20Manager/TESTING_CHECKLIST.md)
- [`SIMPLE_TABLE_DOMAIN_STATUS.md`](/Users/ottohull/builderswebapp/builderswebapp/plans/Testing%20Manager/SIMPLE_TABLE_DOMAIN_STATUS.md)

This top-level file remains only as a bridge so older references do not break.

---

# Testing Philosophy

Testing exists to make sure:
- invalid data is rejected consistently
- shared record-panel behavior stays stable
- critical workflow rules remain correct
- refactors can be validated quickly
- high-risk regressions are caught before release

The core rule is:
- backend owns correctness
- frontend provides UX guardrails
- shared patterns require shared tests

For all active testing strategy and execution tracking, update the files in `plans/Testing Manager/` rather than expanding this file again.
