# Sweep 4e — Decisions checklist + next-sweep punch list

## Decisions to make before sweep 4e executes

### Data shape

- [ ] Restore `listImportOptions` + `ImportFormOptions` to `@builders/db`, **or** inline-compose in `modules/imports/data/queries.ts` from `listProducts` / `listWarehouses` / `listLocationsByWarehouse` / `listCategories` / `listManufacturers`?
- [ ] Place `ImportFormOptions` type in `@builders/domain` (matches `InventoryFormOptions` precedent), **or** keep it in `@builders/db`?
- [ ] Add `manufacturerOptions` to the import options return — yes / no?
- [ ] Live-inventory section on the import detail view: ship UI in 4e, **or** load data server-side now and ship UI in 4f?
- [ ] Drop `awaitingCutBalance`, `availableBalance`, `uncutBalance` cells everywhere, **or** keep cells and substitute `stockBalance` / `coverageBalance` where conceptually close?
- [ ] Drop `totalCostLabel` from the import primary section, **or** compute it server-side from staged + live rows?

### List columns

- [ ] Imports list — replace `itemsCount` with: (a) `stagedInventoryRowsCount` only, (b) `liveInventoryRowsCount` only, (c) both as separate columns, (d) one combined "rows" cell?
- [ ] Imports list — show `percent` column? If yes, format helper name?
- [ ] Imports list — `manufacturerName` column added by default?
- [ ] Imports list grouping — `allowedGroupKeys`: `["warehouse", "manufacturer"]` only, **or** include `"createdAt"` / other fields?
- [ ] Inventory list — replace `stockCount` / balance columns with: (a) `startingStock` + `totalCutSum` + `stockBalance` + `coverageBalance`, (b) leaner subset, (c) other?

### Form shape

- [ ] Import create form — `manufacturerId` required or optional? (Domain treats it as optional string; UI is your call.)
- [ ] Inventory primary form — surface `isArchived` as a toggle in this sweep, **or** defer to a later "archive flow" sweep?

### Staged-rows section

- [ ] Drop the per-row `isImported` cell on the staged-rows section UI (it's no longer in the diff), **or** keep it as a read-only badge sourced from the row record?
- [ ] Display the new `percent` value somewhere on the section header — yes / no?

### Mark-for-import client helper

- [ ] `withMutationMeta` accepts an idempotency-only call (no `expectedUpdatedAt`) — **verify** before relying on it. If not: extend the helper, or pass `""` for the revisionKey arg.

### Renames

- [ ] Rename `use-import-inventory-rows-section.ts` → `use-import-staged-inventory-rows-section.ts` and the matching component file — confirm.
- [ ] Rename `updateImportInventoryRowsRequest` → `updateImportStagedInventoryRowsRequest` — confirm.
- [ ] Rename `ImportInventoryRowDraft` (controllers/drafts.ts) — to `StagedInventoryRowDraft` (alias to domain), **or** keep local name?

### Cleanup

- [ ] Delete `docs/sweep-5a-imports-inventory-api-routes-plan.md` (superseded by 4d)?

---

## Next sweep — sweep 4e

**Title:** Imports + Inventory modules + dashboard rewire to post-alteration domain shapes.

**Plan file:** `docs/sweep-4e-imports-inventory-modules-dashboard-plan.md`.

### Punch list (in execution order)

#### 1. `packages/db` support
- [ ] Restore `listImportOptions` to `packages/db/src/flooring/imports/read-repository.ts` (composes products + warehouses + locations + categories + manufacturers).
- [ ] Define `ImportFormOptions` type (domain or db, per decision above).
- [ ] Re-export from `packages/db/src/index.ts`.

#### 2. `modules/imports/data/`
- [ ] `queries.ts` — drop `transportType`/`status` from `buildImportsOrderBy`; add `manufacturer` group key.
- [ ] `queries.ts` — rewire `getImportFormOptions` to return `productOptions` + `warehouseOptions` + `locationOptions` + `categoryOptions` + `manufacturerOptions`.
- [ ] `queries.ts` — extend `getImportDetailPageData` to load `listStagedInventoryByImport(id)` + `listInventory({ importEntryId: id })` and return `{ entry, stagedRows, liveRows, ...options }`.
- [ ] `queries.ts` — extend `getImportCreatePageData` to include `manufacturerOptions`.
- [ ] `mutations.ts` — rename `updateImportInventoryRowsRequest` → `updateImportStagedInventoryRowsRequest`; new endpoint path; new diff type.
- [ ] `mutations.ts` — add `markStagedRowsForImportRequest`.

#### 3. `modules/inventory/data/`
- [ ] `queries.ts` — drop `{ isImported: true }` from `loadInventoryPageData` (filter no longer has the field).

#### 4. `modules/imports/controllers/`
- [ ] Rename `use-import-inventory-rows-section.ts` → `use-import-staged-inventory-rows-section.ts`.
- [ ] Rewrite to source rows from `serverValue.stagedRows`, build `StagedInventoryRowsDiff` (`startingStock`, no `isImported`), call `updateImportStagedInventoryRowsRequest`.
- [ ] `drafts.ts` — rename `ImportInventoryRowDraft`; rename field `stockCount` → `startingStock`; drop `isImported`; drop `transportType`/`status` from primary form helpers.
- [ ] `use-import-primary-section.ts` — drop `transportType`/`status`; add `manufacturerId`; use `EMPTY_IMPORT_PRIMARY_FORM` + `toImportPrimaryForm`.
- [ ] `use-imports-list-controller.ts` — drop `transportType`/`status` column refs; add `manufacturer` grouping support.

#### 5. `modules/imports/components/`
- [ ] `formatters.ts` — drop `formatImportStatus` / `formatImportTransportType` re-exports.
- [ ] `list/imports-client.tsx` — drop deleted column refs; add `manufacturerName`, counts, optional `percent`.
- [ ] `list/imports-table.tsx` — same as imports-client.
- [ ] `record/import-create-client.tsx` — drop `transportType`/`status` seeding; add `manufacturerId`; receive `manufacturerOptions`.
- [ ] `record/import-detail-client.tsx` — receive `stagedRows`, `liveRows`, `manufacturerOptions`; pass through.
- [ ] `record/import-record-panel.tsx` — update controller import name + section title.
- [ ] Rename `record/sections/import-inventory-rows-section.tsx` → `import-staged-inventory-rows-section.tsx`. Drop `calculateImportSummary`. Field rename `stockCount` → `startingStock`. Drop `isImported` cells.
- [ ] `record/sections/import-primary-fields-section.tsx` — drop `transportType` + `status` field groups; add `manufacturerId` field group; drop `totalCostLabel` ref.

#### 6. `modules/inventory/controllers/`
- [ ] `use-inventory-primary-section.ts` — narrow form to six fields; add `isArchived`; use `EMPTY_INVENTORY_FORM` + `toInventoryForm`.
- [ ] `use-inventory-cut-logs-section.ts` — verify; touch only if a removed field is referenced.
- [ ] `use-inventory-list-controller.ts` — drop column refs to deleted fields.

#### 7. `modules/inventory/components/`
- [ ] `list/inventory-client.tsx` — drop deleted columns; add `startingStock`, `totalCutSum`, `stockBalance`.
- [ ] `list/inventory-table.tsx` — `stockCount` → `startingStock`; `totalCutBalance` → `totalCutSum`; `stockUnit` → `stockUnitAbbrev`; drop deleted balance columns.
- [ ] `record/inventory-record-panel.tsx` — drop `isImported`; rename `stockUnit` / `totalCutBalance`.
- [ ] `record/sections/inventory-primary-fields-section.tsx` — drop `isImported` branch; rename fields per cheatsheet.
- [ ] `record/inventory-detail-client.tsx` — verify props; adjust if removed fields are passed.

#### 8. `app/dashboard/imports/`
- [ ] `page.tsx` — update `allowedGroupKeys`.
- [ ] `[id]/page.tsx` — pass `stagedRows`, `liveRows`, `manufacturerOptions` props.
- [ ] `new/page.tsx` — pass `manufacturerOptions` prop.

#### 9. `app/dashboard/inventory/`
- [ ] `page.tsx` — verify; should compile clean once data layer is fixed.
- [ ] `[id]/page.tsx` — verify; should compile clean once data layer is fixed.

#### 10. Verification
- [ ] `npx tsc -b` from repo root: zero errors.
- [ ] `npm run build:web` succeeds.
- [ ] `/dashboard/imports` renders with new columns.
- [ ] `/dashboard/imports/new` form submits and creates an import.
- [ ] `/dashboard/imports/[id]` primary edit + staged-rows diff save round-trip works (idempotency replay verified).
- [ ] `/dashboard/inventory` renders with new columns.
- [ ] `/dashboard/inventory/[id]` primary edit works.
- [ ] `markStagedRowsForImportRequest` exported from `modules/imports/data/mutations.ts` (no UI yet — for the next sweep).

---

## Sweep after 4e — sweep 4f preview

**Title:** Mark-for-import controller + UI gesture (worker initiator).

### Outline (for context only — do not execute in 4e)
- [ ] New controller hook `use-import-mark-for-import.ts` calling `markStagedRowsForImportRequest`.
- [ ] UI gesture on the staged-rows section: button + selection state + disabled-when-empty + 202 success surface + error/idempotency replay surface.
- [ ] Optional: live-inventory read-only section on the import detail (if deferred from 4e).
- [ ] Optional: worker-status surfacing (Bull Board link, batch progress polling, last-batch result toast).
