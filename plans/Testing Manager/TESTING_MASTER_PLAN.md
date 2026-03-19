# Testing Master Plan
## Canonical Strategy For Production-Grade Test Coverage

This file defines how the system should be tested to reach and maintain production quality.

The goal is not to maximize raw test count.
The goal is to protect the highest-risk business rules, validation boundaries, shared UI behavior, and workflow transitions with the smallest reliable set of tests that can scale with the architecture.

---

# 1. Core Principles

## 1.1 Backend truth, frontend UX guardrails
The backend owns correctness.
The frontend should prevent obvious bad input, show required states clearly, and surface server truth cleanly.

This means:
- routes and domain logic must reject invalid data
- client forms should block obvious invalid submits
- tests must exist at both levels where the user can trigger the behavior

## 1.2 Shared patterns must have shared tests
When multiple domains depend on shared record panels, shared row actions, shared request helpers, or shared editor hooks, those shared pieces need direct tests.

Otherwise drift will happen across domains and domain-level tests will become repetitive and brittle.

## 1.3 Golden reference before broad rollout
For reusable CRUD table domains, `services` is the reference implementation.

The testing pattern should be proven there first, then copied with minimal variation to:
- `unit-of-measures`
- `manufacturers`
- `categories`

## 1.4 Complex domains need dedicated plans
Complex domains must not be forced into the simple-table pattern.

This applies to:
- `properties`
- `products`
- `management-companies`
- `templates`
- `work-orders`
- `imports`
- `inventory`
- `warehouse`

These domains need their own workflow and child-row coverage plans after the simple-table standard is stable.

---

# 2. Required Test Layers

## 2.1 Domain tests
Test:
- business rules
- calculations
- normalization
- mutation logic
- delete protections
- workflow transitions

Use domain tests for correctness that should not depend on routes or browser behavior.

## 2.2 Route and integration tests
Test:
- auth protection
- required fields
- optional field normalization
- decimal and numeric validation
- foreign key validation
- error normalization
- route-to-domain handoff

Routes should stay thin, and tests should confirm they stay thin and accurate.

## 2.3 Component and UI flow tests
Test:
- create/edit/delete panel behavior
- required-field behavior
- request payload correctness
- success and error notices
- delete confirmation behavior
- draft reset behavior
- URL-backed record-opening behavior where applicable

Use these tests to protect the user-visible behavior of shared record-panel patterns.

## 2.4 End-to-end workflow tests
Reserve end-to-end tests for high-risk cross-layer workflows:
- create template
- add template rows
- create work order
- sync template to work order
- destructive-action protections
- role-protected flows

Do not use end-to-end tests to replace route or component coverage.

---

# 3. Simple-Table Domain Quality Gate

No new or refactored simple-table domain should be considered complete unless it has:
- route negative tests
- route happy-path tests
- component create-flow test
- component edit-flow test
- delete and confirm test
- at least one server-error regression test

If the domain uses required fields, those required fields must be tested:
- at the route layer
- at the UI layer when users can trigger the invalid submit in the panel

---

# 4. Bug-Fix Test Rules

Every validation bug fix must add:
- one route-level regression test
- one UI-flow regression test if the behavior is reachable from the panel

Every shared UI bug fix must add:
- one shared-primitive test at the shared layer
- one domain regression test only if the domain wiring itself was part of the bug

---

# 5. Rollout Order

The testing rollout should proceed in this order:

1. Shared primitives
2. `services` as the golden reference domain
3. Remaining simple-table domains
4. Complex domains with dedicated workflow plans
5. Focused end-to-end coverage for the highest-risk system workflows

This order gives the most leverage and reduces repeated test harness work.

---

# 6. Definition Of Success

Testing is successful when:
- invalid data is rejected consistently
- shared CRUD panel behavior is stable across simple domains
- refactors to shared UI and route helpers are caught quickly
- high-risk workflow regressions are caught before release
- new domain work can adopt a reusable testing template instead of inventing test structure ad hoc
