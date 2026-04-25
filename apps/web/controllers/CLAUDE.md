# `apps/web/controllers/` — Reserved

This directory is reserved for the controllers extraction sweep that follows the components extraction.

**Do not add files here without a sibling `apps/web/components/` extraction precedent.** The intent is for controllers to mirror the bucketed shape of `apps/web/components/` (e.g. `controllers/sections/`, `controllers/workflows/`, `controllers/primitives/`), each consuming the corresponding component primitives.

For now, controllers continue to live under `apps/web/modules/<module>/controllers/` (per-module hooks) and `apps/web/modules/shared/engines/record-view/client/controllers/` (shared engine hooks).
