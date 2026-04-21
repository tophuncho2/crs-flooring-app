# Current Plan — Inventory UX sweep (per-row `isImported` status, warehouse editability, column trims, edit gates)

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

**Prisma migrations needed:** zero. All state lives in existing columns.

**Data baseline:** user deleted all inventory + import rows before this sweep. No back-fill DML needed — everything new lands with the right `isImported` defaults. Existing `POST /api/inventory` standalone create route is out of scope for this sweep (placeholder for a future single-row inventory form; not reachable from current UI).

---

## Change 1 — Inventory list view column trim + eligibility rule ✅ **PARTIAL**

**Scope.** UI column trim + a single DB-side eligibility filter. All other layers untouched.

**Status.** UI column trim and status-column helpers are shipped. DB-side eligibility filter is deferred to Change 2 Phase C (where the `listInventory` filter extension lives).

### Completed this pass

- `packages/domain/src/flooring/inventory/formatters.ts` — `formatImportedAsStatus(isImported) => "Pending" | "Final"` added and auto-re-exported via the inventory barrel.
- `apps/web/modules/imports/components/formatters.ts` — `getImportedStatusFieldClass(isImported)` added, delegates to the existing `getImportStatusFieldClass("FINAL" | "PENDING")`.
- `apps/web/modules/inventory/components/list/inventory-client.tsx` — `importTag` and `transport` field defs removed; status-column getter rewired to `formatImportedAsStatus(row.isImported)`; stale imports (`formatImportStatus`, `formatImportTransportType`) dropped.
- `apps/web/modules/inventory/components/list/inventory-table.tsx` — `importTag` and `transport` cell renderers removed; status cell rendered via `formatImportedAsStatus(row.isImported)` + `getImportedStatusFieldClass(row.isImported)`; `getTransportTypeFieldClass` import dropped.
- `@builders/domain` dist rebuilt so the new formatter resolves for web consumers.
- Verification: regression greps zero, web typecheck baseline unchanged at 107 (all pre-existing in `modules/work-orders`), zero new errors in any Change-1 file.

### Deferred from this pass

- **DB-side eligibility filter** (`InventoryListFilter.isImported`, `buildListWhere` branch, `modules/inventory/data/queries.ts` passing `{ isImported: true }`) — lands in **Change 2 Phase C**.
- **Removing derived `importTag` / `importStatus` / `importTransportType` from `InventoryRow`** and pruning the matching `importEntry.tag/status/transportType` selects in `packages/db/src/flooring/inventory/shared.ts` — lands in **Change 2 Phases B + C**. Until then these fields remain on the row type but are no longer read by the list view; consumers elsewhere (e.g. tests, products record view) still resolve.
- Consequence: pending rows still appear in the list during this interim window — the eligibility filter is not yet enforced. Dev smoke for the full UX must wait for Change 2.

### Eligibility rule — pending rows are hidden from the inventory list view

Inventory rows where `isImported === false` are **not eligible** for the inventory dashboard list view and must not appear there. They are draft rows living on their parent import and are only activated by being marked FINAL from the imports record view's inventory-rows section. The rule:

- The inventory list (`/dashboard/inventory`) only shows rows where `isImported === true`.
- The imports record view's inventory-rows section (`/dashboard/imports/[id]`) continues to show **all** rows for that import — both PENDING and FINAL — because it's the surface where users flip the status.
- The inventory record view (`/dashboard/inventory/[id]`) remains reachable by direct URL regardless of `isImported` (deep links, open-in-new-tab from the imports section). Combined with Change 4's edit gate, pending rows are read-only there.

Implementation lives in Change 2 Phase C (data layer — `listInventory` gets an `isImported?: boolean` filter; the inventory dashboard query wrapper passes `{ isImported: true }`). No changes to the imports record view's read path.

### Files

- `apps/web/modules/inventory/components/list/inventory-client.tsx`
  - Delete the `importTag` field definition.
  - Delete the `transport` field definition.
  - Keep the status column. Change its getter to read the per-row `isImported` via a new domain formatter (below). (Post-filter the column always reads "Final" — kept for display consistency and future re-inclusion of pending rows if we ever expose a toggle.)
- `apps/web/modules/inventory/components/list/inventory-table.tsx`
  - Delete the `importTag` and `transport` cell renderers.
  - Status cell: render via `formatImportedAsStatus(row.isImported)` + `getImportedStatusFieldClass(row.isImported)` (two tiny helpers added to `@builders/domain` for symmetry with the existing `formatImportStatus` / `getImportStatusFieldClass`).
  - Remove now-unused imports (`formatImportTransportType`, `getTransportTypeFieldClass`).
- `packages/domain/src/flooring/inventory/formatters.ts` — add `formatImportedAsStatus(isImported: boolean) => "Pending" | "Final"` so tone helpers can key off the same source of truth.
- `apps/web/modules/imports/components/formatters.ts` — add `getImportedStatusFieldClass(isImported: boolean)` mirroring `getImportStatusFieldClass`.

### Blast radius
- Table prefs keyed on removed column names silently drop — matches warehouses/contacts pattern.
- Pending inventory rows created from the imports record view will be invisible on the inventory list until flipped to FINAL. This is the intended UX — flag in dev smoke that a freshly-added row doesn't appear in the inventory list until its import status is set to FINAL from the imports section.

---

## Change 2 — Per-row import status (reuse `isImported`, drop derived fields)

### Phase A — Database
**No migration.** `FlooringInventory.isImported Boolean @default(false)` already exists.

### Phase B — Domain (`packages/domain/src/flooring/inventory/`) ✅ **SHIPPED**

Five files modified, all inside the domain package. Zero imports outside the package — purity preserved (only internal relative `./*.js` imports and `../../shared/line-totals.js` in the pre-existing summary file).

- `types.ts` — removed `importTag`, `importStatus`, `importTransportType` from `InventoryRow`. `importWarehouseId` / `importWarehouseName` retained (used by the primary-section location-scope logic). `isImported: boolean` already present.
- `filters.ts` — `InventoryFilterableRow` now carries `isImported: boolean` instead of `importStatus: string`. `isPendingInventoryRow` rewired to `!row.isImported && Boolean(row.importEntryId)`. `"pending" | "final"` filter vocabulary untouched.
- `errors.ts` — added `IMPORTED_REVERSAL_NOT_ALLOWED` to `InventoryDomainErrorCode`.
- `inventory-rules.ts` — added:
  - `isImportedReversal(current, next) → boolean` — pure predicate, reused by diff validation to collect issues.
  - `assertImportedTransitionAllowed(current, next)` — throws `InventoryDomainError("IMPORTED_REVERSAL_NOT_ALLOWED", ...)` when the predicate fires. Consumed by one-shot update paths that want to fail-fast.
  - `InventoryValidationIssue` gained an `IMPORTED_REVERSAL_NOT_ALLOWED` variant; `describeInventoryValidationIssue` switch extended.
- `diff-types.ts` — added optional `isImported?: boolean` to `InventoryRowDraft` and `InventoryRowUpdatePatch`; added required `isImported: boolean` to `DiffExistingInventoryRow`; added `{ code: "IMPORTED_REVERSAL_NOT_ALLOWED", rowId }` variant to `InventoryDiffValidationIssue` with `describeInventoryDiffIssue` case; added `findImportedReversals(diff, existing)` pure helper; wired it into `validateInventoryRowsDiff`.
- Barrel re-exports — no change needed; the domain `index.ts` already does `export * from "./..."` for every sibling file, so `isImportedReversal`, `assertImportedTransitionAllowed`, and the new issue codes surface automatically.

**Domain purity check.** Every new function is pure: `isImportedReversal` returns a boolean, `findImportedReversals` returns a plain issue array, `assertImportedTransitionAllowed` is the only function that throws and only raises the domain-owned `InventoryDomainError`. No `async`, no DB imports, no Prisma types, no Next.js, no repository or use-case logic landed in the domain package.

**Downstream fallout from this phase** (expected, resolved by later phases — **not** Phase B's job):

- `packages/db/src/flooring/inventory/read-repository.ts` — the normalizer still emits `importTag`, `importStatus`, `importTransportType` as excess properties on the `InventoryRow` return shape. +1 TS error under `@builders/db`. Resolved in **Phase C** when the normalizer drops those fields and the `importEntry.tag/status/transportType` select columns go with them.
- `packages/application/src/flooring/imports/save-inventory-rows.ts` — `toDiffExisting` maps `ExistingRowMeta` → `DiffExistingInventoryRow` without `isImported`. +1 TS error under `@builders/application`. Resolved in **Phase D** (which already extends the query in `loadExistingRows` to select `isImported`, then threads it through `toDiffExisting`).
- `apps/web/tests/modules/products/products-detail-client.test.tsx` — fixture still sets `importTag`, `importStatus`, `importTransportType`. The web `tsconfig.json` excludes the `tests` folder from typecheck, so no baseline impact today. Cleaned during Phase C as a bookkeeping step.

**Baseline counts after Phase B:**
- `@builders/domain`: 0 errors.
- `@builders/db`: 1 new error (the read-repository excess property).
- `@builders/application`: 1 new error (the diff-existing mapping).
- `@builders/web`: unchanged at 107 (all pre-existing in `work-orders`, `admin`, `shared/record-view`, and `templates` — untouched by this sweep).

### Phase C — Data ✅ **SHIPPED**

Five files touched (four source, one test fixture). No Prisma migration needed. `@builders/db` rebuilt clean; the Phase B downstream error in `@builders/db` is resolved. `@builders/web` baseline unchanged at 107 (zero errors in inventory/imports/products/dashboard/api paths).

- `packages/db/src/flooring/inventory/shared.ts` — dropped `tag`, `status`, `transportType` from the `importEntry` select inside `inventoryRowSelect`. Kept `id`, `importNumber`, `warehouseId`, and `warehouse` (still populate `importWarehouse*` on the read shape). `InventoryRowPayload` / `InventoryDetailPayload` auto-narrow from the select.
- `packages/db/src/flooring/inventory/read-repository.ts`:
  - Dropped `importTag`, `importStatus`, `importTransportType` from `normalizeInventoryRow`'s return object. No helpers were exclusive to those fields, so no dead code remained after the field removal — the normalizer stayed lean.
  - Extended `InventoryListFilter` with `isImported?: boolean`.
  - `buildListWhere` now forwards `filter.isImported` as `isImported: <bool>` in the WHERE clause when defined. Supports `true` and `false` for completeness; the dashboard passes `true`.
- `apps/web/modules/inventory/data/queries.ts` — `loadInventoryPageData` now calls `listInventory({ isImported: true })`. This is the single enforcement point for the eligibility rule from Change 1. Every other read path is unaffected: the imports record view reads `listInventory({ importEntryId })` which doesn't filter on `isImported`; single-row `getInventoryById` / `getInventoryDetailById` for deep-link routes are unchanged.
- `packages/db/src/flooring/imports/write-repository.ts` — `applyImportInventoryRowsDiff`:
  - **createMany block:** new rows persist `isImported: draft.isImported ?? false` (respect the caller when set, default `false`).
  - **Warehouse auto-link:** added fallback `?? input.importWarehouseId` on both the `draft.locationId`-present branch and the null-location branch. `input.importWarehouseId` is already passed by `saveImportInventoryRowsUseCase`, so no new plumbing — previously the field was only used for validation. Closes the "added row with no location saved with `warehouseId = null`" gap.
  - **Per-row updates:** `patch.isImported` now flows through — `if (patch.isImported !== undefined) data.isImported = patch.isImported`. Forwards exactly what the caller sent.
- `packages/db/src/flooring/inventory/write-repository.ts` — untouched. Already wired for `isImported` on both create + update.
- `apps/web/tests/modules/products/products-detail-client.test.tsx` — dropped the now-stale `importTag`, `importStatus`, `importTransportType` fields from the inventory-row fixture factory. The file is outside the TS typecheck (`tsconfig.json` excludes `tests/`), but keeping fixture literals consistent with live types is hygiene.

**Dead-normalizer audit.** Nothing was left behind. Grep confirms the only lingering references in `packages/` are inside `packages/db/dist/**` output (regenerates on build). Inside `apps/web/modules/imports/**` the `formatImportStatus` / `formatImportTransportType` / `getTransportTypeFieldClass` helpers stay — they still legitimately render the parent import's own `status` / `transportType` fields in the imports list and primary section (Change 6 decision: those stay editable-as-display on the import record).

**Baselines after Phase C:**
- `@builders/domain`: 0 errors.
- `@builders/db`: 0 errors — Phase B's expected downstream breakage resolved.
- `@builders/application`: 1 error — `save-inventory-rows.ts` `toDiffExisting` still missing `isImported` on the mapped `DiffExistingInventoryRow`. Resolved by **Phase D**.
- `@builders/web`: unchanged at 107 (all pre-existing in `work-orders` / `admin` / `shared/record-view` / `templates`; zero new errors).

### Phase D — Application ✅ **SHIPPED**

Three files touched in `packages/application/`. `@builders/application` builds clean, `dist/` rebuilt, and the final Phase-B downstream error (the `toDiffExisting` mapping) is resolved. `@builders/web` baseline still 107 (zero new errors).

- `packages/application/src/flooring/inventory/errors.ts` — added `IMPORTED_REVERSAL_NOT_ALLOWED` to `InventoryErrorCode`.
- `packages/application/src/flooring/inventory/update-inventory.ts` — added a reversal guard immediately after the `current` load (before validation). Uses the domain predicate `isImportedReversal(current, input)` from `@builders/domain`; when it fires, throws `InventoryExecutionError({ code: "IMPORTED_REVERSAL_NOT_ALLOWED", status: 400, field: "isImported" })`. The use case stays permissive when `input.isImported` is undefined or matches current — only true-→false transitions are blocked. Primary-section PATCH body won't carry `isImported` (Phase E strips it), but this guard protects every caller: imports-diff-driven saves, standalone update, and any future writer.
  - Design note — used the pure predicate `isImportedReversal` instead of calling `assertImportedTransitionAllowed` + catching the domain error. Matches existing update-inventory.ts style where the use case explicitly raises `InventoryExecutionError` with route-layer-friendly fields (status + field). The domain `assert*` helper stays available for callers that prefer fail-fast.
- `packages/application/src/flooring/imports/save-inventory-rows.ts` — Phase B's required `isImported` field on `DiffExistingInventoryRow` forced one update here:
  - `ExistingRowMeta` gained `isImported: boolean`.
  - `loadExistingRows` Prisma `select` block now includes `isImported: true`.
  - `toDiffExisting` now forwards `isImported: row.isImported` into `DiffExistingInventoryRow`.
  - No change to the use-case body — the existing call to `validateInventoryRowsDiff` already threads the new `IMPORTED_REVERSAL_NOT_ALLOWED` issue through `describeInventoryDiffIssues`, so a stale-reversal diff rolls up into `InventoryExecutionError("INVENTORY_DIFF_VALIDATION_FAILED", 400)` with the human-readable reason in the message.

**Baselines after Phase D:**
- `@builders/domain`: 0 errors.
- `@builders/db`: 0 errors.
- `@builders/application`: 0 errors — the last Phase-B/C downstream breakage is resolved.
- `@builders/web`: unchanged at 107 (all pre-existing outside this sweep's scope).

All four backend layers are now green. Phase E (routes) strips `isImported` out of the inventory primary PATCH and threads it through the imports inventory-rows diff shaper.

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
- All existing inventory + import rows were deleted before this sweep; no back-fill DML needed. New rows added via the imports record view start PENDING, then flip to FINAL through the same UI.
- The standalone `POST /api/inventory` create path is out of scope (placeholder for a future single-row form; not reachable from current UI). Leaving it untouched — the path's "starts `false` → read-only" behaviour is irrelevant because no one hits it.

---

## Change 5 — Auto-link warehouse on added imports-inventory rows ✅ **SHIPPED**

Rolled into Change 2 Phase C. Full trace of the wired flow, confirmed end-to-end:

1. **Client controller** `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts:51–54` — `toDraftPayload` sends `warehouseId: null` on added rows with an intentional comment deferring resolution to the use case. No change needed.
2. **Use case** `packages/application/src/flooring/imports/save-inventory-rows.ts:241` — already passes `importWarehouseId: parent.warehouseId || null` into the diff primitive. No change needed.
3. **DB primitive** `packages/db/src/flooring/imports/write-repository.ts:151–153` — Phase C added the `?? input.importWarehouseId` fallback on both the location-present and location-null branches:
   ```ts
   const resolvedWarehouseId = draft.locationId
     ? locationIndex.get(draft.locationId)?.warehouseId ?? draft.warehouseId ?? input.importWarehouseId
     : draft.warehouseId ?? input.importWarehouseId
   ```

Result: an added row with no location picked persists with the parent import's `warehouseId` — never `null`. Validation remains enforced by `validateInventoryRowsDiff`'s existing `IMPORT_WAREHOUSE_MISMATCH` rule if a client explicitly sets a different warehouse.

No type changes, no migration, no separate use case, no new route.

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

## Execution order

1. **Change 1 (list column trim)** — depends on Change 2's formatter helper; land the helper first, then this.
2. **Change 5 (warehouse auto-link)** — single-line fix, preparing for Change 3's required-warehouse rule.
3. **Change 3 (warehouse editable + required)** — UI + domain rule; validation cascades.
4. **Change 2 (per-row isImported status)** — the central change. Drops derived fields, adds UI-editable path, one-way transition rule.
5. **Change 4 (edit gates)** — lands on top of Change 2.
6. **Change 6** — no-op (decision documented, no code change).

The `uncutBalance` → `physicalBalance` rename is **dropped from this sweep** — purely a naming preference, and Sweep 3's categories unit-conversion work may re-rename this field (to `physicalStock`) anyway. Revisit under Sweep 3.

Each change is a standalone commit.

---

## Verification gates

- Per-package builds clean after each change: `pnpm -F @builders/domain build && pnpm -F @builders/db build && pnpm -F @builders/application build && pnpm -F @builders/web typecheck`.
- Regression greps (after Change 2):
  - `grep -rn "importTag\|importTransportType\|row\.importStatus\|importEntry\.status" apps packages | grep -v dist | grep -v node_modules` → zero hits outside the imports module itself.
  - `grep -rn "importStatus: importEntry" packages/db` → zero.
- Dev smoke:
  - **Inventory list:** import tag + transport columns gone; status pill reflects per-row `isImported`. Pending rows (`isImported === false`) never appear in the list; adding a new row from the imports record view leaves the inventory list unchanged until the user flips that row to FINAL.
  - **Inventory record:** primary section is **read-only** for pending rows. Pick an existing pending row → verify all inputs disabled + banner shown. Mark FINAL via imports record view → reload inventory record → all inputs editable.
  - **Inventory record (FINAL row):** warehouse is a `<select>`, required to save (clear → save → validation error). Change warehouse → location dropdown re-filters.
  - **Imports inventory-rows section:** new per-row "Import Status" select. PENDING rows: select is enabled. Flip to FINAL, save → select disables (one-way transition visible).
  - **Server backstop:** PATCH `/api/inventory/[id]/primary/section` with `isImported` in body → validator strips it (property not in shape). PATCH an already-FINAL row via imports diff with `isImported: false` → rejected with `IMPORTED_REVERSAL_NOT_ALLOWED`.
  - **Warehouse auto-link:** on import record with warehouse W, add inventory row with **no location picked** → save → row persists with `warehouseId = W` (not null).
- Import record: parent `status` select still editable, still purely cosmetic after this sweep (no other code reads it).

---

## Resolved decisions (from earlier open questions)

1. **Back-fill DML — not needed.** User deleted all inventory + import rows before this sweep. New rows get the correct `isImported` default (`false`) and flip to `true` via the imports record view as the UX intends.
2. **Standalone `POST /api/inventory` create path — ignored this sweep.** Placeholder for a future single-row inventory form; not reachable from the UI today. No "receive now" affordance, no default flip. Leave the route + use case as-is.
3. **`uncutBalance` → `physicalBalance` rename — dropped.** Purely a naming preference. Sweep 3's categories unit-conversion work introduces `physicalStock` with different math; decide the final name there. No rename this sweep.
- because it is purely a naming preference we will drop this from this current plan. subject to change in sweep 3 