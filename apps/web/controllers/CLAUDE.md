# `apps/web/controllers/` — Shared React Hooks

Top-level controllers home for shared React state hooks. Sub-folders mirror the bucketing of `apps/web/components/`: each controller bucket consumes the matching component primitives.

## Established buckets

| Bucket | Mirrors components | Purpose |
|---|---|---|
| `list-view/` | `components/features/{search,sort,group,paginate}/` | Server-driven list-view controller — owns search/sort/filter/group/paginate state, supports SSR-array + React Query fetch modes. |
| `dropdown-search/` | `components/dropdowns/search-dropdown.tsx` | Async-backed dropdown controller — debounced query + `keepPreviousData` over a module-supplied `searchFn`. |
| `record/` | `components/sections/`, `components/panels/`, `scaffolds/` | Record-view section + page controllers — save/discard/dirty lifecycle, draft persistence, conflict handling, record-cache, batch-select actions. `utils/` subfolder holds pure helpers (draft keys, row-id generation, detail cache, confirm-action helpers) consumed by the controllers. |

Future buckets follow the same rule: a folder here only exists if it mirrors a folder under `apps/web/components/` (or `apps/web/scaffolds/`).

## What stays out

- Per-module hooks stay under `apps/web/modules/<module>/controllers/`.
- Lifecycle / cross-cutting hooks (notices, dirty-state, close-guard, workflow polling) live under `apps/web/hooks/record/` — those are not feature-state controllers. The split: `controllers/` owns state for a feature; `hooks/` is lifecycle plumbing + cross-cutting utilities.
