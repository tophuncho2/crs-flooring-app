# Simple Table Domain Status
## Current Coverage Board For Reusable CRUD Table Domains

Use this file as the operating board for the simple-table testing rollout.
Update it whenever coverage changes materially.

Legend:
- `Done` = implemented and passing
- `Partial` = some coverage exists but not at the standard in the matrix
- `Missing` = not yet implemented

| Domain | Validator Coverage | Route Coverage | Component Flow Coverage | Delete Protections | Regression Coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Services | Done | Done | Done | Done | Done | Route plus client coverage is backed by direct shared CRUD primitive tests, and the client suite now uses the standardized simple-table harness. |
| Unit Of Measures | Done | Done | Done | Done | Done | Route plus client coverage includes linked-delete conflict behavior and now sits on the shared client harness with direct shared primitive protection underneath it. |
| Manufacturers | Done | Done | Done | Done | Done | Route and client coverage covers create/edit/delete plus linked-delete regression behavior, and the client suite now uses the shared simple-table harness. |
| Categories | Done | Done | Done | Done | Done | Route, client, and local validator coverage now sit on top of the direct shared primitive suites and standardized client harness. |

---

# Update Rules

- Keep statuses conservative. Do not mark `Done` unless the matrix is fully satisfied for that category.
- If a domain introduces a new rule, note it in `Notes` and add route plus UI regression coverage.
- If a domain grows beyond the simple-table pattern, move it out of this board and into a dedicated plan.
- Re-check this board if the shared client harness or shared CRUD primitives change materially.
