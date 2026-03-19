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
| Services | Partial | Missing | Partial | Missing | Partial | First reference domain. Create-flow component coverage exists, but route, edit, and delete coverage still need to be brought up to the full matrix. |
| Unit Of Measures | Partial | Missing | Missing | Missing | Missing | Has client-side validation logic and shared panel pattern, but no standardized domain test suite yet. |
| Manufacturers | Partial | Partial | Missing | Missing | Missing | Some route and normalization coverage exists, but not the reusable simple-table panel matrix. |
| Categories | Missing | Missing | Missing | Missing | Missing | In-scope simple-table domain with no standardized testing coverage yet. |

---

# Update Rules

- Keep statuses conservative. Do not mark `Done` unless the matrix is fully satisfied for that category.
- If a domain introduces a new rule, note it in `Notes` and add route plus UI regression coverage.
- If a domain grows beyond the simple-table pattern, move it out of this board and into a dedicated plan.
