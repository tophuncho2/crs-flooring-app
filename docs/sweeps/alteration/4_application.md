# Application — Alterations

Use cases, workflows, orchestration. Grouped by module (order reflects completion order). Source comments in `../mocks.md`.

Layer contract: application imports domain rules to compute orchestration; it calls into data for persistence. Every record-view section listed below needs its own mutation use cases in place before the sweep closes.

## Management Companies

- [ ] `createManagementCompany` use case.
- [ ] `updateManagementCompany` use case.
- [ ] `deleteManagementCompany` use case.

## Properties

- [ ] `createProperty` use case.
- [ ] `updateProperty` use case.
- [ ] `deleteProperty` use case.

## Templates

### Main section

- [ ] `createTemplate` use case.
- [ ] `updateTemplate` use case.
- [ ] `deleteTemplate` use case.

### Material items (child section)

- [ ] Own use case driving the **diff-saving flow** (no per-item create/update/delete — the full set is saved as a diff on submit).
- [ ] Lives inside the new templates packages layer alongside the templates domain and repository.

## Job Types

- [ ] `createJobType` use case.
- [ ] `updateJobType` use case.
- [ ] `deleteJobType` use case.

## Work Orders

### Main section

- [ ] `createWorkOrder` use case.
- [ ] `updateWorkOrder` use case.
- [ ] `deleteWorkOrder` use case.
- [ ] Strip `googleDocUrl` / `googleDriveSlip` from the update use case in `apps/web/modules/work-orders/application/manage-work-order.ts` (~36–37, 88–94).

### Material items with cut logs as child scope

- [ ] Own use case driving the diff-saving flow for material items together with their cut-log allocations.
- [ ] **Deferred** — out of scope until the work orders main section is complete and the cut log use cases are finalized. See `./deferred.md`.
