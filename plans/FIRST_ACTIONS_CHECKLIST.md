# First Actions Checklist
## Immediate Actions To Move The Project Forward Safely

This file stays intentionally short.
It is the root-level action list for what should happen first, not the full project checklist.

- [ ] Lock down public registration so unauthenticated users cannot create privileged accounts.
- [ ] Define the canonical work-order lifecycle, shortage lifecycle, resend rules, and completion rules.
- [ ] Align warehouse section/location behavior with the Prisma schema and remove legacy drift.
- [ ] Create the first explicit permissions matrix for `ADMIN`, `BUILDER`, and any narrower roles that should exist.
- [ ] Add rate limiting to login, registration, uploads, and sensitive write endpoints.
- [ ] Decide the worker rollout boundary: what stays synchronous and what moves to BullMQ.
- [ ] Add startup env validation so missing or malformed platform secrets fail fast.
- [ ] Expand automated tests around template sync, work-order mutation flows, and destructive protections.
- [x] Standardize manager assessment coverage so each manager now has an `assessment/overall-assessment.md` and `assessment/strengths-weaknesses.md`.
- [ ] Standardize manager update discipline so each thread keeps its own `README`, assessment, and next actions current after real project changes.
- [ ] Run the program checklist against the current repo state and mark what is already complete versus still assumed.
