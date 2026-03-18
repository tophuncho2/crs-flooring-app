# Testing Plan
## Quality Standards, Critical Workflows, And Minimum Coverage

This file defines how the system should be tested to reach production quality.

---

# 1. Purpose

Testing is required to make sure:
- critical workflows keep working
- refactors do not silently break operations
- business rules remain correct
- production changes are safer

---

# 2. Test Categories

## Domain tests
Test business rules and mutation logic directly.

## API integration tests
Test routes and validation boundaries.

## UI flow tests
Test important user interactions.

## End-to-end tests
Test complete workflows across major system layers.

---

# 3. Highest-Priority Workflows

The system should first test:
- login/auth
- create template
- add template material items
- add template service items
- create work order
- sync template to draft work order
- edit work-order rows
- delete protections
- shortage behavior once implemented
- completion flow once implemented

---

# 4. Minimum Production Test Requirements

Before calling the system production-ready, test coverage should exist for:
- critical domain mutations
- critical routes
- critical workflow transitions
- template/work-order integrity
- concurrency-sensitive operations

---

# 5. Regression Priorities

Refactors must not break:
- template totals
- work-order totals
- sync behavior
- status transitions
- inventory linkage
- analytics updates

---

# 6. Definition Of Success

Testing is successful when:
- critical workflows are covered
- major refactors can be validated quickly
- high-risk bugs are caught before deploy

---

This file should be updated as the workflow surface grows.
