# Testing Checklist
## Execution Checklist For Bringing The Testing System Up To Architecture Standard

This checklist is the action list for testing work.
It should be updated as testing coverage is added, expanded, or standardized.

The order is intentional.
Shared leverage comes first, then the golden reference domain, then the remaining simple-table rollout, then the complex domains.

---

# 1. Shared Primitives

- [x] Add direct tests for `requestJson`.
- [x] Add direct tests for `BasicRecordPanel`.
- [x] Add direct tests for `RecordPanelFooter`.
- [x] Add direct tests for `useUrlRecordPanel`.
- [x] Add direct tests for `useUrlRecordEditor`.
- [x] Add direct tests for `useChildCollection`.
- [x] Add direct tests for shared required-field styling behavior.
- [x] Add direct tests for shared form status notices.
- [x] Document and implement the standard component test harness for simple table record-panel clients.
- [x] Confirm shared test helpers are reusable across simple-table domains.

---

# 2. Golden Reference Domain: Services

- [x] Add service route tests for POST required-field validation.
- [x] Add service route tests for PATCH required-field validation.
- [x] Add service route happy-path tests.
- [x] Add service route tests for normalized error responses.
- [x] Expand service component tests for create-flow required fields.
- [x] Add service component edit-flow test.
- [x] Add service delete and confirm test.
- [x] Add service linked-delete or conflict-error regression test.
- [x] Confirm service tests are the copyable reference for other simple-table domains.

---

# 3. Remaining Simple-Table Domains

## Unit Of Measures
- [x] Add route validation tests.
- [x] Add route happy-path tests.
- [x] Add create-flow component test.
- [x] Add edit-flow component test.
- [x] Add delete and confirm test.
- [x] Add one server-error regression test.

## Manufacturers
- [x] Add route validation tests.
- [x] Add route happy-path tests.
- [x] Add create-flow component test.
- [x] Add edit-flow component test.
- [x] Add delete and confirm test.
- [x] Add one server-error regression test.

## Categories
- [x] Add route validation tests.
- [x] Add route happy-path tests.
- [x] Add create-flow component test.
- [x] Add edit-flow component test.
- [x] Add delete and confirm test.
- [x] Add one server-error regression test.

---

# 4. Matrix And Governance

- [x] Normalize `services`, `unit-of-measures`, `manufacturers`, and `categories` onto the shared client test harness and shared primitive layer.
- [ ] Require route plus UI regression tests for every validation bug fix in these domains.
- [x] Require shared-primitive tests before broad domain rewrites to shared CRUD panel code.
- [x] Update the domain status board when any simple-table coverage changes.

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
