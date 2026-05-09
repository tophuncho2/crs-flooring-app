## Current Sweep: Remove Locations & Sections (UI only)
Active sweep removes warehouse Location and Section from the UI ONLY. No API, application, domain, data, or Prisma/schema changes in this layer. Subsequent layers (api → application → domain → data → schema) will be scoped in follow-up sweeps. Schema changes always ship in their own commit.

UI surfaces in scope:
- Inventory list view: Location filter + Location column
- Inventory record view: Location dropdown(s) and full-location display
- Cut log columns showing Location (in inventory record view AND work order record view)
- Staged inventory rows: pending and final Location/Section fields
- Cut logs record view (from work orders): Section and Location dropdowns
- Picker components: `apps/web/modules/locations/components/picker/location-picker.tsx` and `apps/web/modules/warehouse-sections/components/picker/section-picker.tsx` (delete; only consumers are the surfaces above)

Out of scope this sweep:
- Warehouse list view and warehouse record view (including its "Sections" panel) — deferred
- API routes, use cases, domain, data layer, Prisma models — separate later sweeps

Saved table preferences: no action needed. `normalizeColumnOrder` / `normalizeColumnVisibility` in the shared list-view engine prune unknown column keys, so stale `location`/`section` entries in users' saved `inventory-main` prefs degrade gracefully. No tableKey bump.

## Important
[ ] Paste headlines, error counts, and TL:DR in the chat, use charts / tables for visual display.
[ ] Any open questions must be in your response
[ ] After executing changes, provide a commit message.

[ ] This process will repeat per layer we scope to.
[ ] Some layers may be executed in a bundle together especially if its a bug fix. Schema changes are always in a commit by itself.
[ ] The list below is in order of how would apply major changes, restructuring or sweeps (what were doing now), and new modules.
[ ] Each layer has a clear definition of its boundaries, rules and things to be responsible for. 
- Schema
- Domain **Predecates, message builders, types, zod schema payload, business logic**
- Data **persisting data, read repository, write repository, helpers and normalizers**
- Application **orchestration of use cases, imports domain rules, initiates outbox events, called on by an api route, opens transactions, decides which rows to lock, each use case has its own file, use cases do not import other use cases**
- Outbox / relay / worker (when applicable)
- API **Imports the cananicol gaunlet of rate limiting, auth, idempotency, telemetry, and calls the db and use-cases**
- Module directory **controllers/ and components/ are imported from either modules/shared or web/ directories such as components/ controllers/ ect.**
- `apps/web/app/dashboard` pages. **Pages import from the module directory**


## Notes

DO NOT COMMIT CHANGES.