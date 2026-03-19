# Dashboard Shell Planning
## Canonical Home For Navigation, Preferences, And Workspace Behavior

This folder is the source of truth for planning the shared dashboard workspace experience.

Use this folder when the work is primarily about:
- persistent navigation behavior
- user-customizable dashboard layout or ordering
- table preference persistence
- hotkeys and workspace shortcuts
- cross-page shell behavior that is not domain logic

This folder exists because the dashboard shell has become its own concern across:
- `app/dashboard/`
- `app/api/account/`
- `server/platform/`
- `server/flooring/hotkeys.ts`

This is not the same as shared variables or shared feature components.
Use [Shared Variables Manager](/Users/ottohull/builderswebapp/builderswebapp/plans/Shared%20Variables%20Manager/README.md) for central values and [Architecture Manager SHARED_FEATURES_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/Architecture%20Manager/SHARED_FEATURES_PLAN.md) for reusable architecture patterns.
Use this folder for the user-facing shell rules that coordinate:
- which tools are visible
- how nav order persists
- how hotkeys map to tools
- how table and workspace preferences are stored

Recommended future files in this folder:
- navigation-state-plan.md
- hotkeys-and-shortcuts-plan.md
- table-preferences-plan.md
- dashboard-shell-consistency-checklist.md
