# Current Plan — Inventory UX sweep (per-row `isImported` status, warehouse editability, column trims, edit gates, `uncutBalance` → `physicalBalance`)

Companion context: `REFERENCE.md` (full four-module vision), `PHASE-E-F-G-ANALYSIS.md` (Sweep-2 routes / modules / dashboard decisions — shipped and green). This plan replaces the shipped Sweep-2 content.

**Design pivot (after audit).** `FlooringInventory.isImported: Boolean @default(false)` already exists and is plumbed through every layer (schema → select → normalizer → domain type → domain rule `canAddCutLog` → app types → update use case → API validator → write repo → diff primitive). No code ever flips it to `true` today, but all the infrastructure is there. **We reuse it as the per-row import status** instead of adding a new `importStatus` column — no Prisma migration needed.

---

## Goals

1. **Trim inventory list columns.** Drop `importTag` and `transport` columns. Keep `importNumber` and the status column, now backed per-row by `isImported` (rendered as a PENDING/FINAL pill).
2. **Per-row import status (reuses `isImported`).** Each inventory row owns its status. Editable only through the imports record view's inventory-rows section. Read-only everywhere else. **One-way transition:** once a row is marked FINAL (`isImported = true`), it cannot be flipped back to PENDING.
3. **Warehouse editable + required** on the inventory record view's primary section (already 95% wired on the save path — UI-only work).
4. **Import record's primary `status` stays editable** (low-blast-radius choice). It's a user-facing display convenience; no code depends on it after Goal 2 lands. Option B — computing it from children — is documented but **deferred** since it would invalidate the existing editable field, primary-form draft, validator, and use cases.
5. **Edit gates keyed on `isImported`:**
   - Inventory record view primary section and cut-logs section are **read-only** when `isImported === false`. The row lives on the parent import until marked FINAL.
   - Cut-log creation is already gated by the domain rule `canAddCutLog` (Sweep 3 wires the UI side).
6. **Auto-link added inventory rows to the parent import's warehouse** even when no location is picked.
7. **Rename `uncutBalance` → `physicalBalance`** for that computed field across UI + domain type + DB normalizer.

**Prisma migrations needed:** zero. All state lives in existing columns.

---

## Change 1 — Inventory list view column trim

**Scope.** UI only. No DB, domain, application, or route changes.

### Files

- `apps/web/modules/inventory/components/list/inventory-client.tsx`
  - Delete the `importTag` field definition.
  - Delete the `transport` field definition.
  - Keep the status column. Change its getter to read the per-row `isImported` via a new domain formatter (below).
- `apps/web/modules/inventory/components/list/inventory-table.tsx`
  - Delete the `importTag` and `transport` cell renderers.
  - Status cell: render via `formatImportedAsStatus(row.isImported)` + `getImportedStatusFieldClass(row.isImported)` (two tiny helpers added to `@builders/domain` for symmetry with the existing `formatImportStatus` / `getImportStatusFieldClass`).
  - Remove now-unused imports (`formatImportTransportType`, `getTransportTypeFieldClass`).
- `packages/domain/src/flooring/inventory/formatters.ts` — add `formatImportedAsStatus(isImported: boolean) => "Pending" | "Final"` so tone helpers can key off the same source of truth.
- `apps/web/modules/imports/components/formatters.ts` — add `getImportedStatusFieldClass(isImported: boolean)` mirroring `getImportStatusFieldClass`.

### Blast radius
- Table prefs keyed on removed column names silently drop — matches warehouses/contacts pattern.
- The existing `status` filter definition in `components/list/table-filters.ts` (tabs with values `"pending" | "final"`) needs its matching function repointed to `isImported` — see Change 2.

---

## Change 2 — Per-row import status (reuse `isImported`, drop derived fields)

### Phase A — Database
**No migration.** `FlooringInventory.isImported Boolean @default(false)` already exists.

### Phase B — Domain (`packages/domain/src/flooring/inventory/`)

- `types.ts` — remove `importTag`, `importStatus`, `importTransportType` from `InventoryRow`. Keep `importWarehouseId` / `importWarehouseName` (used by the primary-section location-scope logic). `isImported: boolean` already present.
- `filters.ts` — rewire `isPendingInventoryRow` to `!row.isImported && Boolean(row.importEntryId)`. Keep the `"pending" | "final"` filter vocabulary. Remove the `importStatus` field from `InventoryFilterableRow`.
- `inventory-rules.ts` — add:
  - `assertImportedTransitionAllowed(current: { isImported }, next: { isImported?: boolean })` — throws when `current.isImported === true` and `next.isImported === false`. One-way transition.
  - New issue code `IMPORTED_REVERSAL_NOT_ALLOWED` surfaced via `describeInventoryValidationIssue`.
- `diff-types.ts` — add `isImported?: boolean` to `InventoryRowDraft` and `InventoryRowUpdatePatch`. Add a validation case to `validateInventoryRowsDiff` that calls `assertImportedTransitionAllowed` per-row against existing state and collects it as an `IMPORTED_REVERSAL_NOT_ALLOWED` issue.
- Re-export `formatImportedAsStatus` and the one-way-transition helpers from the barrel.

### Phase C — Data

- `packages/db/src/flooring/inventory/shared.ts` — already selects `isImported`. Remove the now-unused `importEntry.tag`, `importEntry.status`, `importEntry.transportType` from the select (keep `importEntry.warehouse` + `importEntry.warehouseId`, still used for read-side `importWarehouse*` fields).
- `packages/db/src/flooring/inventory/read-repository.ts` — in `normalizeInventoryRow`:
  - Remove `importTag`, `importStatus`, `importTransportType` from the returned object.
  - `isImported` already passed through at line 131.
- `packages/db/src/flooring/imports/write-repository.ts` — in `applyImportInventoryRowsDiff`:
  - **createMany block (line 143–170):** replace the hardcoded `isImported: false` with `draft.isImported ?? false` — respect the client's value, default to `false`.
  - **Warehouse auto-link fix:** when both `draft.warehouseId` and `draft.locationId` are null, fall back to the parent import's warehouseId (plumbed in via a new `importWarehouseId` param on the diff call — the use case already passes it). This closes the "added row with no location saved with `warehouseId = null`" gap at `write-repository.ts:151–153`.
  - **Per-row updates (line 174–205):** forward `patch.isImported` when present. Persist only the DB-native truthy/falsy value.
- `packages/db/src/flooring/inventory/write-repository.ts` — already handles `isImported` on create + update. No change.

### Phase D — Application

- `packages/application/src/flooring/inventory/update-inventory.ts`:
  - After loading `current`, call `assertImportedTransitionAllowed(current, input)` before validation. Throw `InventoryExecutionError("IMPORTED_REVERSAL_NOT_ALLOWED", 400)`.
  - The primary-section PATCH body does **not** accept `isImported` — see Phase E. But keep the use case permissive so imports-diff-driven saves still work.
- `packages/application/src/flooring/inventory/errors.ts` — add `IMPORTED_REVERSAL_NOT_ALLOWED` to `InventoryErrorCode`.
- `packages/application/src/flooring/imports/save-inventory-rows.ts` — already calls `validateInventoryRowsDiff`; new `IMPORTED_REVERSAL_NOT_ALLOWED` issue flows through `describeInventoryDiffIssues`. No other change.

### Phase E — Routes

- `apps/web/app/api/inventory/_validators.ts` — **remove** `isImported` from `validateUpdateInventoryInput` (currently lines 67–68). The inventory primary section never edits this; only the imports diff path is allowed to set it.
- `apps/web/app/api/imports/_validators.ts` — in `shapeDraft` / `shapePatch`, accept + forward `isImported` as a boolean.

### Phase F — Modules

- `apps/web/modules/imports/controllers/drafts.ts`:
  - Add `isImported: boolean` to `ImportInventoryRowDraft`.
  - `createImportInventoryRowDraft` defaults to `item?.isImported ?? false`.
- `packages/domain/src/flooring/imports/types.ts` — add `isImported: boolean` to `ImportInventoryRow` so seeded drafts can read it.
- `apps/web/modules/imports/components/record/sections/import-inventory-rows-section.tsx`:
  - Add column `{ key: "importStatus", minWidth: 140, align: "center", label: "Import Status" }` — a `<RecordGridCellSelect>` bound to `row.isImported`, options `PENDING` (false) / `FINAL` (true).
  - When `row.isImported === true`, **disable** the select — one-way transition visible in the UI.
- `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts`:
  - Extend `toDraftPayload` to forward `isImported` on added rows.
  - Extend `toUpdatePatch` to diff `isImported`.
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx`:
  - Add a read-only "Import Status" tile in the left pane (`RecordStaticFieldValue` rendering `formatImportedAsStatus(inventory.isImported)`).

### Phase G — Dashboard
No change.

### Blast radius
- **`InventoryRow` shape narrowing** removes three fields (`importTag`, `importStatus`, `importTransportType`). Grep confirms consumers are the inventory list view (already trimmed in Change 1), the `isPendingInventoryRow` filter helper (rewired), and a products test fixture. Test fixture updated to drop the fields.
- **API surface shrinks:** `PATCH /api/inventory/[id]/primary/section` no longer accepts `isImported` — the only path to edit is the imports diff route. Matches the user's intent.
- **One-way transition** is enforced at two layers: domain diff validation (imports-diff path) and domain one-shot rule (standalone update path). Both funnel through `assertImportedTransitionAllowed`.

---

## Change 3 — Warehouse field editable + required (inventory record primary section)

### Save path audit: already in place
- **Route** `apps/web/app/api/inventory/[id]/primary/section/route.ts` uses `validateUpdateInventoryInput` which accepts `warehouseId`.
- **Use case** `updateInventoryUseCase` (`packages/application/src/flooring/inventory/update-inventory.ts:82–94, 128–130`) validates warehouse existence + location-warehouse match + forwards to DB.
- **DB write** `updateInventory` (`packages/db/src/flooring/inventory/write-repository.ts:60–64`) handles connect/disconnect.
- **Controller** `use-inventory-primary-section.ts:43` already serializes `warehouseId` into the PATCH body.

### UI-only work

- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx`:
  - Replace the static `RecordStaticFieldValue` warehouse block (lines 48–54) with a `<select>` wired to `draft.warehouseId` + `onFieldChange("warehouseId", ...)`. New prop: `warehouseOptions: InventoryWarehouseOption[]`.
  - Same pattern as the imports primary section (`import-primary-fields-section.tsx:86–100`).
- `apps/web/modules/inventory/components/record/inventory-record-panel.tsx` — thread `warehouseOptions`.
- `apps/web/modules/inventory/components/record/inventory-detail-client.tsx` — accept + forward `warehouseOptions`.
- `apps/web/app/dashboard/inventory/[id]/page.tsx` — read `warehouseOptions` from `listInventoryOptions()` (already fetched in `getInventoryDetailPageData`, just not returned). Extend `getInventoryDetailPageData` to return the warehouses list.
- `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts` — location-scope logic at lines 89–95 currently prefers `importWarehouseId || warehouseId` from the **server record**. Update to prefer `draft.warehouseId` first so the location dropdown stays in sync when the user changes warehouse before saving.
- `packages/domain/src/flooring/inventory/inventory-rules.ts`:
  - Make `warehouseId` unconditionally required in `validateInventoryInput`. Add a `WAREHOUSE_REQUIRED` issue code (drop the narrower `WAREHOUSE_REQUIRED_FOR_LOCATION` — keep the single unified code).

### Blast radius
- Existing inventory rows with `warehouseId = NULL` stay untouched; they fail to save on next edit until the user picks a warehouse. Matches intent.
- The imports-diff path stamps warehouse from the location's warehouse, or (new in Change 2) from the parent import's warehouse. Rows created via the imports path never have null warehouse after this sweep.

---

## Change 4 — Edit gates on `isImported`

Two gates, both UI-first with a server-side backstop.

### Gate A — Inventory primary-section edits disabled when `isImported === false`
- **UI (primary):** in `inventory-primary-fields-section.tsx` + `inventory-record-panel.tsx`, compute `const isReadOnly = !inventory.isImported`. Disable every input / select, hide the "Save" button (or show it disabled). Display a small banner: *"This row is pending import. It becomes editable once marked as FINAL on the import record."*
- **UI (delete):** likewise disable the delete button when `!isImported` (rows should be removed via the imports diff while pending).
- **Server backstop:** add to `updateInventoryUseCase` (before the update write): if `current.isImported === false`, throw `InventoryExecutionError("INVENTORY_PENDING_IMPORT", 400)`. Extend `errors.ts`.

### Gate B — Cut-logs section disabled when `isImported === false`
- **Domain:** already exists (`canAddCutLog`, reserved error `CUT_LOG_INVENTORY_NOT_IMPORTED`).
- **UI (cut-logs section):** in `inventory-cut-logs-section.tsx`, when `!isImported`, hide add-row controls + any inline edit affordances (Sweep 3 wires the edit UI — until then the section is already read-only, so just stub a pre-emptive banner: *"Cut logs unlock once this row is marked FINAL on the import."*).

### Blast radius
- `isImported = false` is **every row today** (no flow flips it). On merge day, **every existing inventory record view becomes read-only** until a user marks it FINAL from the imports record view. Explicit migration step: we don't back-fill `isImported = true`; we let users mark rows FINAL as they process them. **Flag this** — if you want a one-time "back-fill every existing row to true" SQL, add it as a separate data migration before UI flip. Not a schema migration, just a DML.
- The inventory primary section becoming read-only until `isImported=true` changes the UX of the standalone `POST /api/inventory` create path (created rows start `false` and are immediately uneditable). Acceptable because the same user created the row; they can flip it from the imports record view if associated with an import, or via a future dedicated "receive" action. **Flag to confirm:** is the standalone create path a real user flow, and if so, do we need an "auto-import" gesture on the create page?

---

## Change 5 — Auto-link warehouse on added imports-inventory rows

Currently at `packages/db/src/flooring/imports/write-repository.ts:151–153`:

```ts
const resolvedWarehouseId = draft.locationId
  ? locationIndex.get(draft.locationId)?.warehouseId ?? draft.warehouseId
  : draft.warehouseId  // ← falls back to null when draft doesn't set it
```

**Fix** (one line):

```ts
const resolvedWarehouseId = draft.locationId
  ? locationIndex.get(draft.locationId)?.warehouseId ?? draft.warehouseId ?? input.importWarehouseId
  : draft.warehouseId ?? input.importWarehouseId  // ← new fallback
```

`input.importWarehouseId` is already passed into the diff primitive. No type changes. No migration.

---

## Change 6 — Import record's primary `status` stays editable (low-blast-radius choice)

**Decision:** keep `FlooringImportEntry.status` as an editable string, displayed in the imports primary section and list view.

- Nothing else depends on it after Change 2 removes the derived `InventoryRow.importStatus`. It becomes pure user-facing display metadata — a note the user can tag the import with.
- **Blast radius of this decision:** zero. No code change, no schema change. Keep the existing `<select>` in `import-primary-fields-section.tsx`, keep the existing `status` column in `imports-table.tsx`.

**Deferred alternative** (Option B — computed rollup): derive parent status from children: `FINAL` if every child row `isImported === true` and at least one exists; `PENDING` otherwise. Requires:
- Drop `status` from `ImportPrimaryForm`, `EMPTY_IMPORT_PRIMARY_FORM`, validators, create + update use cases.
- Compute in `packages/domain/src/flooring/imports/summary.ts` (new `calculateImportRollupStatus(rows)`) and expose on `ImportRow` + `ImportDetail` normalizers.
- Swap the `<select>` for a read-only `StatusPill`.
- Eventually drop the column via migration (separate sweep).

**Not doing this sweep** per the note that high blast radius should be skipped. Can be picked up standalone later.

---

## Change 7 — Rename `uncutBalance` → `physicalBalance`

Renames a single computed field. Not persisted; no migration.

| Layer | File:line | Change |
|---|---|---|
| Domain type | `packages/domain/src/flooring/inventory/types.ts:52` | `uncutBalance` → `physicalBalance` |
| DB normalizer | `packages/db/src/flooring/inventory/read-repository.ts:90, 135` | Local var `uncut` → `physical`; key `uncutBalance` → `physicalBalance` |
| Inventory list columns | `apps/web/modules/inventory/components/list/inventory-client.tsx:84` | key + label |
| Inventory list cells | `apps/web/modules/inventory/components/list/inventory-table.tsx:125–129` | key + field reference |
| Inventory primary fields | `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx:77–82` | Label + field reference |
| Products record view | `apps/web/modules/products/components/record/product-inventory-rows-section.tsx:28, 96–97` | key + label + reference |

**Name-collision flag.** Sweep 3's categories unit-conversion plan introduces `physicalStock = stockCount − (awaitingCutBalance + totalCutBalance)` — different math from today's `uncutBalance = stockCount − totalCut`. We rename to `physicalBalance` now per your instruction; Sweep 3 may re-point or re-rename. One rename at a time.

---

## Execution order

1. **Change 7 (rename)** — smallest, purely mechanical, green baseline.
2. **Change 1 (list column trim)** — depends on Change 2's formatter helper; land its helper first, then this.
3. **Change 5 (warehouse auto-link)** — single-line fix, preparing for Change 3's required-warehouse rule.
4. **Change 3 (warehouse editable + required)** — UI + domain rule; validation cascades.
5. **Change 2 (per-row isImported status)** — the central change. Drops derived fields, adds UI-editable path, one-way transition rule.
6. **Change 4 (edit gates)** — lands on top of Change 2. Includes the data-migration decision about back-filling `isImported = true` for existing rows.
7. **Change 6** — no-op (decision documented, no code change).

Each is a standalone commit.

---

## Verification gates

- Per-package builds clean after each change: `pnpm -F @builders/domain build && pnpm -F @builders/db build && pnpm -F @builders/application build && pnpm -F @builders/web typecheck`.
- Regression greps (after Change 2):
  - `grep -rn "importTag\|importTransportType\|row\.importStatus\|importEntry\.status" apps packages | grep -v dist | grep -v node_modules` → zero hits outside the imports module itself.
  - `grep -rn "importStatus: importEntry" packages/db` → zero.
- Dev smoke:
  - **Inventory list:** import tag + transport columns gone; status pill reflects per-row `isImported`.
  - **Inventory record:** primary section is **read-only** for pending rows. Pick an existing pending row → verify all inputs disabled + banner shown. Mark FINAL via imports record view → reload inventory record → all inputs editable.
  - **Inventory record (FINAL row):** warehouse is a `<select>`, required to save (clear → save → validation error). Change warehouse → location dropdown re-filters.
  - **Imports inventory-rows section:** new per-row "Import Status" select. PENDING rows: select is enabled. Flip to FINAL, save → select disables (one-way transition visible).
  - **Server backstop:** PATCH `/api/inventory/[id]/primary/section` with `isImported` in body → validator strips it (property not in shape). PATCH an already-FINAL row via imports diff with `isImported: false` → rejected with `IMPORTED_REVERSAL_NOT_ALLOWED`.
  - **Warehouse auto-link:** on import record with warehouse W, add inventory row with **no location picked** → save → row persists with `warehouseId = W` (not null).
- Import record: parent `status` select still editable, still purely cosmetic after this sweep (no other code reads it).

---

## Open questions

1. **Back-fill existing rows to `isImported = true`?** Every row in DB today is `false`. On merge day, every inventory record view becomes read-only. A one-time DML `UPDATE flooring_inventory SET "isImported" = true WHERE "importEntryId" IS NOT NULL` (or just `= true` globally) would un-brick existing records. Do you want that included, or do users manually mark them FINAL going forward? (Not a schema migration — a data migration.)
2. **Standalone `POST /api/inventory` create path.** Standalone-created rows start `isImported = false`, immediately read-only. Is this path a real user flow in your UI today? If yes, we may want a "receive now" toggle on the create page, or flip the standalone create path to default `true`.
3. **Rename collision** (`physicalBalance` vs Sweep 3's planned `physicalStock`). Stick with `physicalBalance` now (per your wording), accept a possible future rename when Sweep 3 lands.
