# Data Layer — Alterations

Read/write repos and persistence. Grouped by module. Source comments in `../mocks.md`.

## Main-Hub / Templates

- [ ] Connect a file bucket for template-generated files (templates are the first module to persist to bucket storage).

## Main-Hub / Work Orders

- [ ] Remove `googleDocUrl` / `googleDriveSlip` writes from `apps/web/modules/work-orders/mutations.ts` — create flow (~246–247) and update flow (~347–348, 399–405).
- [ ] Remove `googleDocUrl` / `googleDriveSlip` normalization from `apps/web/modules/work-orders/services.ts` (~64–65, 97–98).
- [ ] Update `apps/web/tests/engines/record-view/workflow-core.test.ts` fixture to drop the two fields.
