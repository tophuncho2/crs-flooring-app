# Cut Logs Domain — Types

Canonical types under `packages/domain/src/flooring/cut-logs/`.

## `CutLogRow` / `CutLogForm`

- `id: string`
- `inventoryId: string` — required
- `workOrderId: string | null`
- `workOrderItemId: string | null`
- `before: string` — decimal string, stock-unit
- `cut: string`
- `after: string`
- `status: CutLogStatus`
- `notes: string | null`
- `createdAt: string` / `updatedAt: string`

`CutLogForm` is `Pick<CutLogRow, "inventoryId" | "workOrderId" | "workOrderItemId" | "before" | "cut" | "after" | "status" | "notes">` — everything a writer can set. `after` is Form-supplied but redundantly verified by the arithmetic invariant; the validator can either require it or derive it — implementation choice, but the wire format carries it.

## Constants

```ts
export const CUT_LOG_STATUS_VALUES = ["PENDING", "FINAL"] as const
export type CutLogStatus = typeof CUT_LOG_STATUS_VALUES[number]
```

Closed-set string. DB column is `text` with no CHECK; closed set enforced at the domain (guard) and route validator only. UI presents as a single-select dropdown — never free text.

## Helpers

- `EMPTY_CUT_LOG_FORM: CutLogForm`
- `toCutLogForm(row: CutLogRow): CutLogForm`
- `formatCutLogStatus(s: CutLogStatus): string` — `"PENDING"` → `"Pending Cut"`, `"FINAL"` → `"Final Cut"`. UI label.

## Parent scoping

Cut logs are never surfaced standalone. Every `CutLogRow` is rendered inside one of:
- An inventory record view's cut-logs child section (where `workOrderId` / `workOrderItemId` may or may not be set).
- A work-order record view's material-items section, nested under the parent item (where all three scoping ids are always set).

The parent context determines linking rules at create time — see `rules.md`.
