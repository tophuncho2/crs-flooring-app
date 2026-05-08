# WOMI / cut-log Inventory column — drop locationCode, ship inventory ref package

## Context

The Work Order Material Items section renders an **Inventory** column in the cut-log subgrid (one row per cut log under each material item) and an **Inventory** read-only field in the cut-log edit side panel. Both render the same string today: `inventoryNumber · locationCode`.

`locationCode` is **not stored**. It's computed at render time by `formatFullLocationCode()` after a 4-table join through `location → section / rafter / level / warehouse`. That join is the only reason the eligible-inventory read pulls the location subtree at all. The user wants to drop `locationCode` from the displayed package, replace it with `itemNumber` and `dyeLot` (both already columns on `FlooringInventory`), and let the data layer shed the join.

Layers touched: **Domain** (new format helper) + **Data** (drop join from a canonical read) + **Module** (cell, side panel, rich dropdown). No schema, no application, no API.

## The package

```
inventoryNumber - itemNumber - dyeLot - notes
```

- ` - ` separator (space-hyphen-space)
- Skip empty/null parts; never emit a leading, trailing, or double separator
- `notes` is `FlooringInventory.notes` (the inventory record's own notes, **not** the cut log's notes — those keep their own column in the subgrid)
- Examples:
  - `INV-001`, `ITM-A`, `DL5`, `holdback` → `INV-001 - ITM-A - DL5 - holdback`
  - `INV-001`, null, `DL5`, null → `INV-001 - DL5`
  - `INV-001`, null, null, null → `INV-001`

Lives in **domain**, callable from any layer. The cell, side panel, and rich-dropdown subtitle pipeline all consume it.

**Nuance flagged:** inventory `notes` is unbounded free text. In the cut-log subgrid cell it'll get truncated by the existing `truncate` class (single-line). In the side panel `TextCell` it'll fit on one line and clip. If notes commonly run long, the package could feel noisy — flag for review during manual verification; if it's a problem we can cap notes at e.g. 24 chars + ellipsis inside the helper.

## Changes

### 1. New domain helper

**File:** `packages/domain/src/flooring/inventory/format-inventory-ref-package.ts` (new)

```ts
export type InventoryRefPackageInput = {
  inventoryNumber: string
  itemNumber?: string | null
  dyeLot?: string | null
  notes?: string | null
}

export function formatInventoryRefPackage(input: InventoryRefPackageInput): string {
  return [input.inventoryNumber, input.itemNumber, input.dyeLot, input.notes]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0)
    .join(" - ")
}
```

Re-export from `packages/domain/src/flooring/inventory/index.ts`.

### 2. Cut-log subgrid Inventory cell

**File:** [apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx:83-88](apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx)

Today:
```ts
const label = inventoryLabels.get(cutLog.inventoryId)
const display = label
  ? `${label.inventoryNumber}${label.locationCode ? ` · ${label.locationCode}` : ""}`
  : cutLog.inventoryId
```

After: look up `{ inventoryNumber, itemNumber, dyeLot, notes }` and call `formatInventoryRefPackage`. The `inventoryLabels` map shape changes from `{ inventoryNumber, locationCode }` → `{ inventoryNumber, itemNumber, dyeLot, notes }`. Trace its build site (the component fetches eligible inventory client-side) and update.

### 3. Side panel inventory display

**File:** [apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/cut-log-edit-form-fields.tsx:40-47](apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/cut-log-edit-form-fields.tsx)

Replace the IIFE:
```ts
const inventoryDisplay = (() => {
  if (!cutLog) return "—"
  const inv = eligibleInventory.find((i) => i.id === cutLog.inventoryId)
  if (inv) return formatInventoryRefPackage(inv)
  return cutLog.inventoryId
})()
```

### 4. InventoryRichDropdown — drop locationCode subtitle

**File:** [apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/inventory-rich-dropdown.tsx:58-69](apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/inventory-rich-dropdown.tsx)

Today the subtitles array is `[remainingStock+unit, locationCode, itemNumber, dyeLot]`. After:

```ts
subtitles: [
  `${inv.remainingStock} ${inv.stockUnitAbbrev}`,
  inv.itemNumber || undefined,
  inv.dyeLot || undefined,
  inv.notes || undefined,
].filter((part): part is string => Boolean(part)),
```

Title stays `inventoryNumber`. Search loses `locationCode` as a match term and gains `notes` — confirmed acceptable.

### 5. Drop the location join from the canonical read

**File:** [packages/db/src/flooring/work-orders/material-items/read-repository.ts:90-163](packages/db/src/flooring/work-orders/material-items/read-repository.ts) (`listEligibleInventoryForWorkOrderItem`)

- Remove the `location: { select: { id, rafter, level, warehouseId, section: {...}, warehouse: {...} } }` include from the select.
- Remove the `formatFullLocationCode()` call from the returned row mapping.
- Drop `locationCode` from the returned `EligibleInventoryRow` shape.
- Add `notes` to the select (already a column on `FlooringInventory` — confirmed at [schema.prisma:315](packages/db/prisma/schema.prisma:315)).
- Add `notes` to the returned `EligibleInventoryRow` shape.

This is the actual server-side win: a 4-table location join goes away, replaced by one extra scalar column on the same row.

### 6. Type cleanup

The `EligibleInventoryRow` type is exported from [apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts](apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts) and consumed by the dropdown + form fields. After removing `locationCode`, follow the type errors:
- Drop `locationCode` from any DTO / mapper between the route handler and the controller.
- If `formatFullLocationCode` has no remaining callers, mark it for deletion (verify with grep before removing — it may be used elsewhere in inventory views).

### 7. Out of scope (future schema commit)

The cut log row stamps `stockUnitAbbrev` etc. but **not** any inventory display fields. Today the WOMI subgrid does a client-side eligible-inventory fetch per material item and looks up by `inventoryId` — N round-trips for the same map. Folding `inventoryNumber`/`itemNumber`/`dyeLot` snapshots onto the cut log row would let the cut log canonical read serve the cell directly. That's a Prisma schema change — per `CLAUDE.md` it ships in its own commit. Logged here, not in this PR.

## Critical files

- `packages/domain/src/flooring/inventory/format-inventory-ref-package.ts` (new)
- `packages/domain/src/flooring/inventory/index.ts` (re-export)
- `packages/db/src/flooring/work-orders/material-items/read-repository.ts` (drop join)
- `apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx` (cell)
- `apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/cut-log-edit-form-fields.tsx` (side panel)
- `apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/inventory-rich-dropdown.tsx` (dropdown)
- `apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts` (type)

## Verification

1. `npm run typecheck` (root) — must pass after the type changes propagate.
2. Open a work order with at least one material item that has cut logs.
   - Inventory column in the cut-log subgrid shows `INV# - itemNumber - dyeLot - notes`, folding cleanly when fields are missing.
   - Open the cut-log side panel on a row → Inventory field shows the same package.
   - Open the create-mode dropdown → locationCode no longer appears in subtitles; itemNumber, dyeLot, and notes are searchable.
3. Spot-check a row with no `itemNumber`, no `dyeLot`, and no `notes` — the cell renders just the inventory number, no trailing dashes.
4. Spot-check a row with **long** inventory `notes` to confirm the cell truncates cleanly and doesn't blow out row height. If notes overrun, decide whether to cap inside `formatInventoryRefPackage`.
4. (Manual SQL check, optional) Run an EXPLAIN on the eligible-inventory query before/after to confirm the location subtree is gone from the plan.

## Open questions

- **Notes truncation** — inventory `notes` is unbounded free text. Plan ships the full string and relies on the cell's existing `truncate` class. If long notes degrade readability, we cap in the helper (e.g. 24 chars + ellipsis). Decide during manual verification.
