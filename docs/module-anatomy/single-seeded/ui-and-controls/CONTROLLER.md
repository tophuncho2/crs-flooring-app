# Single-Seeded — List Controller

> The single-seeded controller contract. Evidence: `apps/web/modules/{categories,unit-of-measures}/controllers/use-{name}-list-controller.ts`.

## Where

`apps/web/modules/{name}/controllers/use-{name}-list-controller.ts` (folder is `controllers/` — plural).

One file per module. No primary-section controller, no record controller.

## Shape

`"use client"` hook. One `useState(initialRows)`. No filters, no mutation helpers, no async, no `requestJson`.

- **Categories** returns `{ rows }` only.
- **Unit of Measures** returns `{ rows, notices }` — imports `useRecordNotices` from `shared/engines/record-view/client/hooks/use-record-notices` to surface transient status messages in the scaffold.

No setter is exported from either module. Rows are seeded once from the server; the client never mutates.

## Imports (canonical set)

- `useState` from `react`
- `{Name}Row` type from `../types`
- Optional: `useRecordNotices` from `@/modules/shared/engines/record-view/client/hooks/use-record-notices` (UoM pattern)

Nothing from `@builders/application`. Nothing from `@builders/domain` (except indirectly via the Row type when it's promoted — not the case for single-seeded, see `modules/TYPES.md`).

## What it does NOT have

1. No mutation helpers (no `create…`, `update…`, `delete…`).
2. No `requestJson` or any client-side fetch. Single-seeded has no client-initiated writes and the engine handles re-reads via URL.
3. No filter state, sort state, or pagination state — those live in `useListViewEngine` inside the list client.
4. No `useEffect`-driven data loading. Initial rows come from the Server Component via props.

## Variation to decide

The `notices` slot is in UoM but not in categories. If reference data needs transient status messaging (e.g. sync banner), adopt `notices` everywhere. Otherwise drop it from UoM.
