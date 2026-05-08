# WOMI / cut-log Inventory column — execution summary

Plan: [sessions/2026-05-03-womi-inventory-package-plan.md](sessions/2026-05-03-womi-inventory-package-plan.md)
Branch: `staging`
Layers touched: **Domain** (new helper) + **Data** (drop join) + **Module** (cell, side panel, dropdown). No schema, no application, no API logic.

## TL;DR

The cut-log subgrid Inventory column and the side-panel Inventory display now render

```
inventoryNumber - itemNumber - dyeLot - notes
```

…folding cleanly when any field is null. `locationCode` is gone from every render path. The 4-table location join (`location → section/rafter/level/warehouse`) has been removed from `listEligibleInventoryForWorkOrderItem`; `notes` is added as a single scalar column on the same row. The `InventoryRichDropdown`'s in-component **section / location filter rows** are removed (their data source is gone) — the dropdown's built-in substring search now matches against `inventoryNumber + itemNumber + dyeLot + notes`.

## Files changed

| File | Change |
|---|---|
| [packages/domain/src/flooring/inventory/format-inventory-ref-package.ts](packages/domain/src/flooring/inventory/format-inventory-ref-package.ts) | **New.** `formatInventoryRefPackage({ inventoryNumber, itemNumber?, dyeLot?, notes? })` — joins non-empty/trim parts with " - ". |
| [packages/domain/src/flooring/inventory/index.ts](packages/domain/src/flooring/inventory/index.ts) | Re-export the new helper. |
| [packages/db/src/flooring/work-orders/material-items/read-repository.ts](packages/db/src/flooring/work-orders/material-items/read-repository.ts) | Dropped `formatFullLocationCode` / `formatSectionCode` imports. Dropped the `location: { ... }` include from the select. Added `notes: true`. `EligibleInventoryRow` type drops `locationCode` + `sectionCode`, gains `notes`. |
| [apps/web/modules/work-orders/data/mutations.ts](apps/web/modules/work-orders/data/mutations.ts) | `listEligibleInventoryRequest` response type: drop `locationCode` + `sectionCode`, add `notes`. |
| [apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts](apps/web/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel.ts) | UI `EligibleInventoryRow` type: drop `locationCode` + `sectionCode`, add `notes`. |
| [apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/inventory-rich-dropdown.tsx](apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/inventory-rich-dropdown.tsx) | Removed section/location filter rows (`SelectDropdown` for section, `SelectDropdown` for location, the `useState` for both filters, both `useMemo` option lists, and the `visibleInventories` filter memo). Subtitles now `[remainingStock+unit, itemNumber, dyeLot, notes]`. Search placeholder updated. |
| [apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx) | `InventoryLabelData` type: drop `locationCode`, add `itemNumber/dyeLot/notes`. Cell renderer uses `formatInventoryRefPackage`. Comment updated. |
| [apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/cut-log-edit-form-fields.tsx](apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/cut-log-edit-form-fields.tsx) | `inventoryDisplay` IIFE uses `formatInventoryRefPackage`. |

## Divergences from plan

1. **Removed the section / location filter rows from `InventoryRichDropdown`.** The plan was about subtitles only, but the filter rows are wired to `sectionCode` and `locationCode`, both of which come from the now-deleted location join. Keeping them with empty data would have left dead UI. The dropdown's built-in substring search already covers the relevant identifiers (number / item / dye lot / notes), so this is a net-cleaner UX. Worth confirming during manual verification.
2. **Plan listed five files in the Critical Files table** but `mutations.ts` also needed a type update — the HTTP response type was hand-written and would have drifted otherwise. Updated.
3. **`formatFullLocationCode` / `formatSectionCode` are NOT removed** from the domain layer — both have other callers across `packages/db` and the inventory module. Only the import in `read-repository.ts` was dropped.

## Verification

- `npm run typecheck` (full monorepo) → **passes**.
- Manual UI smoke test pending:
  1. Open a work order detail with cut logs → cut-log subgrid Inventory cell shows the new package.
  2. Open the side panel on a cut log → Inventory field shows the same package.
  3. Open the create-mode dropdown → no section/location filter rows; subtitle shows item / dyeLot / notes; search matches all of them; locationCode is absent everywhere.
  4. Spot-check a row with no `itemNumber`, no `dyeLot`, no `notes` → cell renders just the inventory number, no trailing dashes.
  5. Spot-check long inventory `notes` → confirm cell `truncate` keeps row height stable. If it doesn't, cap inside the helper.

## Out of scope (future schema commit)

Per `CLAUDE.md` schema changes ship alone. The cut log row currently stores only `inventoryId` (FK), so the WOMI subgrid does a per-material-item client-side fetch of eligible inventory just to populate the label map — N round-trips for the same data. Fix: stamp `inventoryNumber / itemNumber / dyeLot / notes` snapshots onto the cut log at create time. Logged as the natural follow-up.

## Commit message (DO NOT COMMIT — per CLAUDE.md)

```
work-orders: replace inventory locationCode with itemNumber/dyeLot/notes package

The cut-log subgrid Inventory cell and side-panel Inventory field render
inventoryNumber - itemNumber - dyeLot - notes via a new domain helper
formatInventoryRefPackage. locationCode is dropped from every render
path, which lets listEligibleInventoryForWorkOrderItem shed its 4-table
location → section/rafter/level/warehouse join in favor of one extra
scalar column (FlooringInventory.notes already exists). The
InventoryRichDropdown's section/location filter rows go away with the
underlying data — its built-in substring search now covers
number/item/dye lot/notes.

No schema change. The future denormalization of inventory display
fields onto the cut log row (to kill the per-WOMI eligible-inventory
fetch entirely) is a separate schema commit.
```
