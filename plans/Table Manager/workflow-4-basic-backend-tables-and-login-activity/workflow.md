# Workflow 4
## Basic Backend Tables And Login Activity

## Purpose

This workflow defines the support tables and backend-facing records that keep the rest of the flooring system usable, standardized, and governable.

## User Navigation Flow

1. User manages reference tables such as categories, units of measure, and services.
2. User manages warehouse records, then creates sections and locations under each warehouse.
3. Those support records feed the larger workflows for products, imports, inventory, templates, and work orders.
4. Builder/admin users review user login activity and related backend tables as part of system governance rather than customer workflow.

## Current Implemented Behavior

- `implemented`: categories behave like a simple backend table with create/edit/delete patterns.
- `implemented`: units of measure behave like a simple backend table with create/edit/delete patterns.
- `implemented`: services behave like a simple backend table with create/edit/delete patterns.
- `implemented`: warehouses now support warehouse -> section -> location structure using Prisma-backed section and location records.
- `partially implemented`: warehouses function operationally, but their broader relationship to downstream workflows still needs better user guidance.
- `partially implemented`: login activity exists as backend information, but it is not yet described or integrated as a polished operational review workflow.

## Missing Behavior

- `missing`: stronger standardized `Open` behavior across all simple backend tables where deeper detail is useful.
- `missing`: clearer workflow guidance showing which backend tables are foundational reference data for the rest of the app.
- `missing`: a clearer login-activity operational workflow for builder/admin review.
- `missing`: stronger separation between simple reference-table behavior and larger operational-table behavior in the user experience.

## Workflow Risks And Ambiguous Decisions

- `partially implemented`: some backend tables are simple-table patterns, while warehouses are already a nested operational workflow; the UI should not pretend they are all identical.
- `future-state / pending workflow finalization`: login activity and related backend governance may need its own deeper workflow later depending on security hardening and audit requirements.

## User-Workflow Checklist

- [ ] Clarify which backend tables are pure reference tables versus operational support tables.
- [ ] Standardize simple-table behavior where it should stay simple.
- [ ] Keep warehouses documented as a nested workflow, not just a flat backend table.
- [ ] Define the intended user workflow for reviewing login activity and related governance records.
