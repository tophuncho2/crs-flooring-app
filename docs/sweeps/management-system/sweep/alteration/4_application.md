# Application — Alterations

Use cases, workflows, orchestration. Grouped by module. Source comments in `../mocks.md`.

## Main-Hub / Templates

- [ ] Introduce a worker for file generation (templates are the first module to use one).
- [ ] Decide whether generated files auto-download to the user's device (leaning simplest path). Work orders will later mimic this flow with minor differences.

## Main-Hub / Work Orders

- [ ] Strip `googleDocUrl` / `googleDriveSlip` from the update use case in `apps/web/modules/work-orders/application/manage-work-order.ts` (~36–37, 88–94).
