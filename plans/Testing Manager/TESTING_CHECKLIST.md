# Testing Checklist
## Execution Checklist For Bringing The Testing System Up To Architecture Standard

This checklist is the action list for testing work.
It should be updated as testing coverage is added, expanded, or standardized.

The order is intentional.
Shared leverage comes first, then the golden reference domain, then the remaining simple-table rollout, then the complex domains.

---

# 1. Shared Primitives

- [ ] Add direct tests for `requestJson`.
- [ ] Add direct tests for `BasicRecordPanel`.
- [ ] Add direct tests for `RecordPanelFooter`.
- [ ] Add direct tests for `useUrlRecordEditor`.
- [ ] Add direct tests for shared required-field styling behavior.
- [ ] Document the standard component test harness for record-panel clients.
- [ ] Confirm shared test helpers are reusable across simple-table domains.

---

# 2. Golden Reference Domain: Services

- [ ] Add service route tests for POST required-field validation.
- [ ] Add service route tests for PATCH required-field validation.
- [ ] Add service route happy-path tests.
- [ ] Add service route tests for normalized error responses.
- [ ] Expand service component tests for create-flow required fields.
- [ ] Add service component edit-flow test.
- [ ] Add service delete and confirm test.
- [ ] Add service linked-delete or conflict-error regression test.
- [ ] Confirm service tests are the copyable reference for other simple-table domains.

---

# 3. Remaining Simple-Table Domains

## Unit Of Measures
- [ ] Add route validation tests.
- [ ] Add route happy-path tests.
- [ ] Add create-flow component test.
- [ ] Add edit-flow component test.
- [ ] Add delete and confirm test.
- [ ] Add one server-error regression test.

## Manufacturers
- [ ] Add route validation tests.
- [ ] Add route happy-path tests.
- [ ] Add create-flow component test.
- [ ] Add edit-flow component test.
- [ ] Add delete and confirm test.
- [ ] Add one server-error regression test.

## Categories
- [ ] Add route validation tests.
- [ ] Add route happy-path tests.
- [ ] Add create-flow component test.
- [ ] Add edit-flow component test.
- [ ] Add delete and confirm test.
- [ ] Add one server-error regression test.

---

# 4. Matrix And Governance

- [ ] Keep `services`, `unit-of-measures`, `manufacturers`, and `categories` aligned to the simple-table matrix.
- [ ] Require route plus UI regression tests for every validation bug fix in these domains.
- [ ] Require shared-primitive tests before broad domain rewrites to shared CRUD panel code.
- [ ] Update the domain status board when any simple-table coverage changes.

---

# 5. Complex Domains After Simple-Table Stability

- [ ] Create a dedicated testing plan for `properties`.
- [ ] Create a dedicated testing plan for `products`.
- [ ] Create a dedicated testing plan for `management-companies`.
- [ ] Create a dedicated testing plan for `templates`.
- [ ] Create a dedicated testing plan for `work-orders`.
- [ ] Create a dedicated testing plan for `imports`.
- [ ] Create a dedicated testing plan for `inventory`.
- [x] Create and execute dedicated route/helper/component coverage for `warehouse`.
- [ ] Add workflow and child-row coverage checklists for complex domains instead of reusing the simple-table matrix blindly.

---

# 6. System-Level Testing

- [ ] Add focused end-to-end coverage for the highest-risk workflow paths.
- [ ] Add role and auth coverage for critical protected routes.
- [ ] Add destructive-action protection coverage in the highest-risk domains.
- [ ] Add testing expectations to CI or release gating.

---

# 7. Maintenance Rules

- [ ] Update this checklist when a new reusable testing standard is introduced.
- [ ] Add a regression checkbox when a production bug reveals a missing test category.
- [ ] Keep this file action-oriented and avoid turning it into a narrative plan.
