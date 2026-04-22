# Sweep plan — inventory location display split + static-cell cleanup

Scoped to **inventory** and **imports** modules. Phase 1 of the broader location-dropdown UX work; the canonical searchable-dropdown primitive and its per-module adapter home have been **extracted to `docs/planned utilities/RECORD-COMBOBOX-PRIMITIVE.md`** so they can land alongside the system-wide search/sort/grouping upgrade. Prisma migrations: **none**.

Sibling of `CURRENT.PLAN.md` (the per-row `isImported` sweep); runs after that sweep is merged, because Category B touches the same `InventoryRow` / `ImportInventoryRow` shapes.

---

## Context

Two UX complaints motivate this sweep:

1. The **Section field** on the inventory record view's main section is redundant — the location dropdown already encodes section + rafter + level, and the warehouse tile already conveys warehouse context. The **Import Status** tile + list column on inventory are also read-only noise (status is only editable from the imports inventory-rows section).
2. The **location column / cell / dropdown** everywhere currently renders the full `W{n}-S{n}-R{n}-L{n}` code. That's noisy in a dense grid and redundant with the separate warehouse context. The location cell should show only `R{n}-L{n}` and a separate field/tile should show the full code for the selected location.

The third original complaint — the native `<select>`'s lack of search affordance — drove the combobox primitive work. That has been extracted to `docs/planned utilities/RECORD-COMBOBOX-PRIMITIVE.md` and will land alongside the system-wide search/sort/grouping upgrade.

---

## Grounded survey (as-of pre-sweep)

- **Domain option type.** `packages/domain/src/flooring/inventory/types.ts` — `InventoryLocationOption { id, warehouseId, locationCode, sectionNumber, warehouseName }`. `locationCode` was the full `W{n}-S{n}-R{n}-L{n}` string, produced by `formatFullLocationCode` in `packages/domain/src/flooring/inventory/formatters.ts`.
- **DB normalizers.**
  - `packages/db/src/flooring/inventory/read-repository.ts` — `buildLocationCode` calls the domain formatter; `listInventoryOptions` pre-computes `locationCode` for every option.
  - `packages/db/src/flooring/imports/read-repository.ts` — `formatImportLocationCode` was a local duplicate of the same formula (hadn't adopted the domain helper); options pre-compute in `listImportOptions`.
- **UI consumers of the full code.**
  - Inventory list column + cell, inventory primary section `<select>` option labels, imports inventory-rows grid `<RecordGridCellSelect>` — all rendered the full `locationCode`.
- **Section field on the record view.** `inventory-primary-fields-section.tsx` rendered a dedicated "Section" tile wired to `activeSectionName`, computed in `use-inventory-primary-section.ts` from `selectedLocation.sectionNumber ?? record.sectionNumber`.

For the dropdown-primitive survey (what's there today vs what the new primitive replaces), see `docs/planned utilities/RECORD-COMBOBOX-PRIMITIVE.md`.

---

## Category A · Remove redundant static cells (section + import status)

### A.1 · Section tile (inventory record view)
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — delete the `<RecordFormField label="Section">` block in the left pane.
- `apps/web/modules/inventory/components/record/inventory-record-panel.tsx` — stop threading `sectionName`.
- `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts` — delete the `activeSectionName` computation and its return.
- `InventoryLocationOption.sectionNumber` stays in domain — harmless, potentially useful for future grouping/search.

### A.2 · Import Status tile (inventory record view, per R15)
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — delete the `<RecordFormField label="Import Status">` block. Drop the `formatImportedAsStatus` import if no remaining usage in this file.
- Rationale: the tile is read-only; status is only editable from the imports inventory-rows section.

### A.3 · Import Status column (inventory list view, per R15)
- `apps/web/modules/inventory/components/list/inventory-client.tsx` — delete the `status` column definition.
- `apps/web/modules/inventory/components/list/inventory-table.tsx` — delete the `status` cell renderer. Drop `StatusPill`, `getImportedStatusFieldClass`, and `formatImportedAsStatus` imports if no remaining usage in this file.

### Blast radius
- Five files in the inventory module. No domain, no DB, no route changes. Zero downstream consumers of `activeSectionName`.
- The inventory list view's "Section" column (`inventory-client.tsx`, `inventory-table.tsx`) stays (locked by R1).

---

## Category B · Split location code into SHORT (`R{n}-L{n}`) + FULL (`W{n}-S{n}-R{n}-L{n}`)

### Domain
- New formatter in `packages/domain/src/flooring/inventory/formatters.ts`:
  ```ts
  export function formatLocationRafterLevel(input: { rafter: number; level: number }): string {
    return `R${input.rafter}-L${input.level}`
  }
  ```
  Auto-exported via the inventory barrel.
- `InventoryLocationOption` gains `shortCode: string` (full `locationCode` kept for compatibility).
- `InventoryRow` gains `locationShortCode: string`.
- `ImportInventoryRow` gains `locationShortCode: string`.
- Imports domain adopts `formatFullLocationCode` from the inventory domain — drop the duplicated local helper in the imports normalizer so there's one source of truth for the full format.

### Data
- `packages/db/src/flooring/inventory/read-repository.ts` — normalizer emits `locationShortCode`; `listInventoryOptions` sets both `locationCode` (full) and `shortCode`.
- `packages/db/src/flooring/imports/read-repository.ts` — normalizer emits `locationShortCode` via `formatLocationRafterLevel`; `formatImportLocationCode` deleted in favour of `formatFullLocationCode`.
- `apps/web/modules/imports/data/queries.ts` — the `getImportFormOptions` location loader threads `shortCode` into the bag passed to the UI.

### UI
- `apps/web/modules/inventory/components/list/inventory-client.tsx` + `inventory-table.tsx` — existing Location column + cell read `row.locationShortCode`. Column label stays "Location". Add a second column `fullLocation` reading `row.locationCode` (full `W{n}-S{n}-R{n}-L{n}`), `defaultHidden: true` — follows the existing `cost` / `freight` / `notes` hidden-by-default pattern and is toggleable via the columns manager.
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — dropdown option labels use `shortCode`. Add a new read-only **"Full Location"** tile in the left pane showing `selectedLocation.locationCode` (full code). "Full Location" is the canonical label everywhere — the plan no longer references "full warehouse code".
- `apps/web/modules/imports/components/record/sections/import-inventory-rows-section.tsx` — dropdown option labels use `shortCode`. Grid does **not** get a separate full-code field; the import's top-level warehouse plus the short code in the location cell is sufficient.

### Blast radius
- Domain: +2 fields, +1 formatter. Additive, non-breaking.
- Data: 2 normalizer functions + 2 option emitters touched. **No Prisma schema change.**
- Web: 4 UI touch-points (list cell, list column config, inventory primary section, imports grid).
- Test fixtures under `apps/web/tests/**` may need an added `locationShortCode` field for hygiene. `tsconfig.json` excludes `tests/` so no typecheck pain.
- Any external parser of `row.locationCode` still gets the full form (unchanged).

---

## Dropdown primitive, adapter home, wire-up — extracted

Previously Categories C (`RecordCombobox` primitive), D (per-module `data/dropdown-options/` home + type normalization), and E (wire inventory + imports dropdowns to the combobox) lived here. They have been moved to:

> **`docs/planned utilities/RECORD-COMBOBOX-PRIMITIVE.md`**

…so they can be picked up as a unit when the system-wide search / sort / grouping upgrade lands. The inventory record view's location dropdown is already warehouse-filtered and disabled-until-warehouse-selected (shipped in the "bonus" step below); the combobox migration is the last piece and is decoupled until its broader sweep is ready.

---

## Execution order

### Phase 1 — shipped
1. **Category A** — Section tile + Import Status tile/column removal (A.1 + A.2 + A.3).
2. **Category B** — Location short/full split: domain + data + UI cascade (list column, hidden full column, record-view tile, option labels via `label = shortCode`).
3. **Bonus from the extracted dropdown plan:** disabled inventory record view location `<select>` until a warehouse is chosen (R13). One-line controller change + one attribute on the `<select>`.

### Phase 2 — see `docs/planned utilities/RECORD-COMBOBOX-PRIMITIVE.md`

Each Phase 1 step was a standalone commit.

---

## Verification gates

- `@builders/{domain,db,application}` build clean after each step.
- `@builders/web` typecheck baseline holds (inventory + imports files must remain at zero errors; only pre-existing work-orders/admin errors remain).
- Regression greps:
  - After B: `grep -rn "locationCode" apps/web/modules/inventory apps/web/modules/imports` → only intentional hits remain (Full Location tile, hidden `fullLocation` list column, imports UI-local `LocationOption` pending Phase 2 cleanup).
  - After A: `grep -rn "Import Status\|activeSectionName" apps/web/modules/inventory` → zero matches.
- Dev smoke:
  - Inventory list shows `R{n}-L{n}` in the Location column; Full Location column is available via the columns manager (hidden by default) and renders `W{n}-S{n}-R{n}-L{n}` when toggled on. "Import Status" column is gone.
  - Inventory record view: no Section tile, no Import Status tile; new Full Location tile renders the selected location's full code; Location `<select>` option labels show `R{n}-L{n}`; `<select>` is disabled with "Select warehouse first" until a warehouse is chosen.
  - Imports inventory-rows section: location cell `<option>` labels show `R{n}-L{n}`.
  - Save → record-view reconciles with updated location fields.

---

## Resolved decisions (from user review, Phase 1 only)

- **R1 — Section column in inventory list view:** keep it.
- **R2 — Full-Location column in inventory list view:** add it as `defaultHidden: true` (toggleable via the columns manager).
- **R3 — Full-Location in the imports grid row:** do **not** add. The import's top-level warehouse plus the short code in the location cell is enough.
- **R4 — Inventory record view location filter:** filter by `draft.warehouseId` (already in place). Clearing `locationId` on warehouse change is deferred to the extracted combobox sweep.
- **R5 — Terminology:** the full `W{n}-S{n}-R{n}-L{n}` string is always "Full Location".
- **R12 — Full-Location list column key + label:** `{ key: "fullLocation", label: "Full Location", defaultHidden: true, groupable: true }`.
- **R13 — Inventory record view location `<select>` when no warehouse is selected:** disabled with placeholder "Select warehouse first".
- **R15 — Import Status cell removal from inventory:** delete both the record-view tile and the list-view column. Status is read-only from the inventory module; editing lives exclusively on the imports inventory-rows section.

Decisions about the combobox primitive, per-module adapter home, type normalization of `imports/controllers/drafts.ts:LocationOption`, popover positioning, component naming, and loader architecture (previously R6–R11, R14) have moved to `docs/planned utilities/RECORD-COMBOBOX-PRIMITIVE.md` alongside the primitive itself.

---

## Open flags / questions

All Phase 1 flags are resolved. Phase 2 flags (F1 — domain predicate extraction, F5 — portalled-popover keyboard scope) live with the combobox plan in `docs/planned utilities/RECORD-COMBOBOX-PRIMITIVE.md`.
