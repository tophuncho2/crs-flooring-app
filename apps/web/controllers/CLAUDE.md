# `apps/web/controllers/` — Shared React Hooks

Top-level controllers home for shared React state hooks. Sub-folders mirror the bucketing of `apps/web/components/`: each controller bucket consumes the matching component primitives.

## Established buckets

| Bucket | Mirrors components | Purpose |
|---|---|---|
| `list-view/` | `components/features/{search,sort,group,paginate}/` | Server-driven list-view controller — owns search/sort/filter/group/paginate state, supports SSR-array + React Query fetch modes. |
| `dropdown-search/` | `components/dropdowns/search-dropdown.tsx` | Async-backed dropdown controller — debounced query + `keepPreviousData` over a module-supplied `searchFn`. |

Future buckets follow the same rule: a folder here only exists if it mirrors a folder under `apps/web/components/`. Examples that may land later: `controllers/sections/`, `controllers/workflows/`, `controllers/primitives/`.

## What stays out

- Per-module hooks stay under `apps/web/modules/<module>/controllers/`.
- Shared engine hooks (record-view client controllers) stay under `apps/web/modules/shared/engines/record-view/client/controllers/` until each module migrates off the engine.
