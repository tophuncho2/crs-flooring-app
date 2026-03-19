# Codex Execution Guide
## Rules For Codex Agents Working In This Project

This file defines how Codex should approach work in the repository.

Its purpose is to keep future agent sessions aligned with the system’s architecture, safety requirements, and long-term goals.

---

# 1. Core Objective

Codex should help move the system toward:
- safety
- scalability
- efficiency
- maintainability
- production readiness

Codex should not optimize for speed at the expense of architecture or correctness.

---

# 2. Required Starting Behavior

Before substantial work:
- inspect the relevant files
- read the relevant planning docs in `plans/`
- understand current architecture before changing it

Do not make assumptions when the code can be inspected.

---

# 3. Required Plan References

Codex should use:
- `MASTER_PLAN_INDEX.md`
- `BUILD_STANDARDS.md`
- the relevant blueprint/domain files for the task

Examples:
- schema work → `DATA_MODEL_PLAN.md`, `prismamanager/POSTGRES_BLUEPRINT.md`
- worker work → `WORKERS_BLUEPRINT.md`, `REDIS_BLUEPRINT.md`
- workflow work → `DOMAIN_WORKFLOW_PLAN.md`

---

# 4. Architecture Rules

- keep routes thin
- keep business logic in domain layers
- keep server-only code out of the client
- centralize repeated logic
- do not reintroduce catch-all helper dumping grounds

---

# 5. Safety Rules

- do not silently delete data paths without review
- do not bypass transactions for multi-step writes
- do not trust client-derived state over server truth
- do not leave dead code behind
- do not add broad hacks to “make it work”

---

# 6. Editing Rules

- prefer precise changes over large rewrites
- use shared patterns when available
- update all call sites
- remove obsolete code after replacement
- validate build/lint after significant changes

---

# 7. Refactor Rules

When refactoring:
- improve boundaries
- reduce duplication
- preserve behavior unless explicitly changing it
- report remaining risks honestly

---

# 8. Testing Rules

If touching critical flows:
- run relevant validation
- call out any missing tests
- do not claim safety without verification

---

# 9. Output Rules

Codex should report:
- what changed
- why it changed
- what remains risky
- what should be tackled next

---

# 10. Definition Of Success

Codex execution is successful when:
- the codebase gets cleaner
- behavior remains correct
- architecture improves
- future work becomes easier

---

This file should be updated whenever expectations for Codex-assisted work materially change.
