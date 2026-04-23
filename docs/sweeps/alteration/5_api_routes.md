# API Routes — Alterations

HTTP / tRPC endpoints. Grouped by module. Source comments in `../mocks.md`.

## Main-Hub / Work Orders

- [ ] Remove the `workOrderImageUrl` → `googleDriveSlip` and `googleDocUrl` → `googleDocUrl` input mappings from the work-order create/update endpoints. Breaking change — coordinate with any external/API consumers before release.
