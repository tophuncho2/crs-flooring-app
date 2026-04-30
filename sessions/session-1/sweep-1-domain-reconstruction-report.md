## Report

### 1. Per-file delta

| File | Change |
|---|---|
| `packages/domain/src/flooring/imports/types.ts` | **Untouched.** No `ImportEntryDeleteLinkState` alias added — no consumer benefit; surface left as-is per the prompt's "only if it makes downstream consumers cleaner." |
| `packages/domain/src/flooring/imports/staged-inventory-rows/types.ts` | Added `import type { FlooringStagedRowStatus }` from `@prisma/client` and a `export type` re-export of the same. Added `status: FlooringStagedRowStatus` field to `StagedInventoryRow`. Changed `importNumber: string` → `importNumber: number` (Prisma column is `Int`). Updated header comment to describe DRAFT/QUEUED/IMPORTED lifecycle. `StagedInventoryForm` and `EMPTY_STAGED_INVENTORY_FORM` left alone (form fields are still consistent). |
| `packages/domain/src/flooring/imports/staged-inventory-rows/editability.ts` | Added four status-aware predicates (`isStagedRowEditable`, `isStagedRowQueued`, `isStagedRowMaterialized`, `canDeleteStagedRow`). Added `buildStagedRowNotDraftMessage`. Extended `StagedImportabilityReason` with `NOT_DRAFT_STATUS` and `ALREADY_QUEUED`, ordered as priority-first. Updated `getStagedRowImportabilityBlocker` and `canImportStagedRow` `Pick` to include `status`. Legacy `isStagedRowLocked` kept; doc-comment now flags it as superseded. |
| `packages/domain/src/flooring/imports/staged-inventory-rows/import-batch-rules.ts` | Added `"status"` to the `Pick<StagedInventoryRow, ...>` so the validator passes the new enum through to the importability blocker. Added co-located `buildStagedImportBatchIneligibleMessage` for the `STAGED_ROW_BATCH_INELIGIBLE` case. |
| `packages/domain/src/flooring/imports/staged-inventory-rows/import-batch-payload.ts` | **Full rewrite.** Replaced plain `StagedImportBatchTakenEvent` + `buildStagedImportBatchTakenEvent` with a Zod schema mirroring the work-order auto-allocation convention: `IMPORT_MATERIALIZE_TOPIC` literal const, `ImportMaterializeBatchPayloadSchema` (with `version: "v1"`, topic discriminator, `importEntryId` uuid, `stagedRowIds` 1–500 uuid array, `requestedBy.{userId,userEmail}`, `requestedAt` ISO 8601), inferred `ImportMaterializeBatchPayload` type, `parseImportMaterializeBatchPayload` parser. |
| `packages/domain/src/flooring/imports/staged-inventory-rows/errors.ts` | Extended `StagedInventoryDomainErrorCode` with three new codes: `STAGED_ROW_NOT_DRAFT`, `STAGED_ROW_ALREADY_QUEUED`, `STAGED_ROW_BATCH_INELIGIBLE`. Class definition unchanged. |
| `packages/domain/src/flooring/imports/staged-inventory-rows/index.ts` | **Untouched.** Existing `export *` lines already cover all touched files; new symbols flow through automatically. |
| `packages/domain/src/flooring/inventory/types.ts` | Added `inventoryNumber: string` to `InventoryRow` immediately after `id`. Updated header comment to document the sequence-assigned `INV-00001` value. `isImported` was already absent (per audit confirmation); nothing to remove. |
| `packages/domain/src/flooring/inventory/editability.ts` | Added `categorySupportsCoverageComputation(categorySlug)` that delegates to `categoryRequiresCoveragePerUnit` from `../categories/rules.js` (no slug duplication). Added co-located `buildInventoryFieldNotEditableMessage` for the `INVENTORY_FIELD_NOT_EDITABLE` case. |
| `packages/domain/src/flooring/inventory/formatters.ts` | Added `buildInventoryDropdownLabel` per the prompt's spec — pure string format, em-dash placeholder for nulls, drops trailing space when `stockUnitAbbrev` is null. No current callers (sweep-2 cut-log dropdowns will adopt). |
| `packages/domain/src/flooring/inventory/errors.ts` | Extended `InventoryDomainErrorCode` with `INVENTORY_FIELD_NOT_EDITABLE` and `INVENTORY_OVERSOLD`. Class definition unchanged. |
| `packages/domain/src/flooring/inventory/computed.ts` | Added co-located `buildInventoryOversoldMessage` next to the balance math (single source of truth for the formula format). |
| `packages/domain/src/flooring/inventory/index.ts` | **Untouched.** `export *` already covers all touched files. |

### 2. New exports added, by module

**`packages/domain/src/flooring/imports/staged-inventory-rows/`:**

- types: `FlooringStagedRowStatus` (re-exported from `@prisma/client`)
- editability: `isStagedRowEditable`, `isStagedRowQueued`, `isStagedRowMaterialized`, `canDeleteStagedRow`, `buildStagedRowNotDraftMessage`
- import-batch-rules: `buildStagedImportBatchIneligibleMessage`
- import-batch-payload: `IMPORT_MATERIALIZE_TOPIC`, `ImportMaterializeBatchPayloadSchema`, `ImportMaterializeBatchPayload`, `parseImportMaterializeBatchPayload`
- errors: 3 new codes added to the union (`STAGED_ROW_NOT_DRAFT`, `STAGED_ROW_ALREADY_QUEUED`, `STAGED_ROW_BATCH_INELIGIBLE`)

Extended union: `StagedImportabilityReason` now also includes `"NOT_DRAFT_STATUS"` and `"ALREADY_QUEUED"`.

**`packages/domain/src/flooring/inventory/`:**

- editability: `categorySupportsCoverageComputation`, `buildInventoryFieldNotEditableMessage`
- formatters: `buildInventoryDropdownLabel`
- computed: `buildInventoryOversoldMessage`
- errors: 2 new codes added to the union (`INVENTORY_FIELD_NOT_EDITABLE`, `INVENTORY_OVERSOLD`)

### 3. Symbols deleted

- `StagedImportBatchTakenEvent` — plain TS shape removed; superseded by `ImportMaterializeBatchPayload` (Zod-inferred).
- `buildStagedImportBatchTakenEvent` — builder removed; the new contract owns parsing/validation, not construction (the application layer's outbox-write use case will build the payload object inline against the schema).

`InventoryRow.isImported` was already absent (per audit), so nothing was removed there.

### 4. `npm run build --workspace=packages/domain` result

Succeeded cleanly. No errors, no warnings (the IDE-time deprecation warnings on `.uuid()` / `.email()` / `.datetime()` from Zod 4 are non-fatal — the same warnings apply to the existing `packages/domain/src/queue/auto-allocate-work-order.ts` and the build does not fail on them).

Verified new symbols are present in `packages/domain/dist/`:

```
dist/flooring/imports/staged-inventory-rows/editability.js  → isStagedRowEditable, isStagedRowQueued, isStagedRowMaterialized, canDeleteStagedRow, buildStagedRowNotDraftMessage
dist/flooring/imports/staged-inventory-rows/import-batch-payload.js  → IMPORT_MATERIALIZE_TOPIC, ImportMaterializeBatchPayloadSchema, parseImportMaterializeBatchPayload
dist/flooring/imports/staged-inventory-rows/import-batch-rules.js  → buildStagedImportBatchIneligibleMessage
dist/flooring/inventory/computed.js  → buildInventoryOversoldMessage
dist/flooring/inventory/editability.js  → categorySupportsCoverageComputation, buildInventoryFieldNotEditableMessage
dist/flooring/inventory/formatters.js  → buildInventoryDropdownLabel
dist/flooring/inventory/types.d.ts:17  → inventoryNumber: string
```

### 5. `tsc --noEmit` diff vs baseline

`prisma validate` passes. `tsc --noEmit` on `packages/db`:

```
src/flooring/imports/staged-inventory-rows/read-repository.ts(43,5): error TS2322: Type 'string' is not assignable to type 'number'.
src/flooring/imports/staged-inventory-rows/read-repository.ts(54,5): error TS2322: Type 'string | null' is not assignable to type 'string'.
src/flooring/inventory/cut-logs/write-repository.ts(149,7): error TS2820: Type '"VOIDED"' is not assignable to type 'FlooringCutLogStatus | EnumFlooringCutLogStatusFieldUpdateOperationsInput | undefined'. Did you mean '"VOID"'?
src/flooring/inventory/read-repository.ts(111,5): error TS2322: Type 'string | null' is not assignable to type 'string'.
```

**Baseline (still present, unchanged):**
- `cut-logs/write-repository.ts:149` ✓
- `staged-inventory-rows/read-repository.ts:54` ✓
- `inventory/read-repository.ts:111` ✓

**New from this sweep (1 visible bridge error, expected):**
- `staged-inventory-rows/read-repository.ts:43` — `importNumber: String(row.importEntry.importNumber)` returns `string`, domain now expects `number`. Direct consequence of the `importNumber` type-fix in the audit's "Open observations" item 5.

**Latent (will surface when sweep 2 fixes the baseline):** TypeScript is currently masking these because each return statement already errors on a sibling property. They're real defects introduced by this sweep that the data layer will need to address:

- `normalizeInventoryRow` return literal in `inventory/read-repository.ts:90` is missing `inventoryNumber`. Once line 111 (`itemNumber`) is fixed, tsc will emit a TS2740 "Property 'inventoryNumber' is missing".
- `normalizeStagedInventoryRow` return literal in `staged-inventory-rows/read-repository.ts:40` is missing `status`. Once lines 43 (`importNumber`) and 54 (`itemNumber`) are fixed, tsc will emit a TS2740 "Property 'status' is missing".

Verified the latent-error mechanism by inserting a one-off test file: when an explicit cast forces a missing-property check, tsc correctly reports `TS2740: Type '{ id: string; }' is missing the following properties from type 'InventoryRow': inventoryNumber, ...`.

**Application layer + apps/web:** Errors reported by the monorepo `tsc -b` (86 distinct error rows across 21 files) match the audit's documented Section 5.2 sibling-error inventory. Spot-checked the three biggest categories (`update-import.ts` stale `transportType`/`status`/`isImportStatus`/`isImportTransportType`/`updateImport`/`UpdateImportInput` references; `update-inventory.ts` stale `isImportedReversal`/`updateInventory`/`current.isImported`; `apps/web/modules/imports/data/queries.ts` stale exports) — all confirmed pre-existing per the audit's Section 5.2 enumeration. **No new application-layer or apps/web errors caused by this sweep.**

The application layer's `current.isImported` reference at `update-inventory.ts:41` was already broken (the audit's Open observations item 4 documents `InventoryRow` already lacks `isImported`); my changes didn't disturb that state.

### 6. Deviations from the prompt

1. **`requestedAt: z.string().datetime()`** — the prompt's literal snippet uses `.datetime()`; the cited reference convention (`packages/domain/src/queue/auto-allocate-work-order.ts:48`) uses `z.string().min(1)` aliased as `isoTimestamp` to avoid Zod 4's deprecation warnings. I followed the prompt's literal snippet (`.datetime()`) since it's stricter and the deprecation is non-fatal — the same warnings already exist on the work-order file's `.uuid()` / `.email()` calls and the build is unaffected.

2. **`buildStagedImportBatchIneligibleMessage` location** — the prompt said "Add corresponding messages in the file that owns each predicate, following the co-location convention." `STAGED_ROW_NOT_DRAFT` got `buildStagedRowNotDraftMessage` colocated in `editability.ts` (matches `isStagedRowEditable` predicate). `STAGED_ROW_ALREADY_QUEUED` did not get its own message builder — the existing `buildStagedRowNotDraftMessage` already covers QUEUED via its switch, since the rejection condition is "row isn't in DRAFT" regardless of which non-DRAFT status it's in. `STAGED_ROW_BATCH_INELIGIBLE` got `buildStagedImportBatchIneligibleMessage` colocated in `import-batch-rules.ts` next to the validator that produces the issue list. No standalone `messages.ts` files created.

3. **`buildInventoryFieldNotEditableMessage` location** — placed in `inventory/editability.ts` next to `INVENTORY_EDITABLE_FIELDS` / `isInventoryFieldEditable`. The prompt said "Co-locate any message builders with the predicate that produces them." — that's the predicate that gates the rejection, so this is the natural home.

4. **`buildInventoryOversoldMessage` location** — placed in `inventory/computed.ts` next to `computeInventoryBalance`. The prompt described it as "for sweep 2's use" and called for co-location with the predicate. `computed.ts` owns the balance math; the message format depends on the same fields. Alternative would be `errors.ts`, but that would break the no-standalone-`messages.ts` convention by making `errors.ts` accumulate prose.

### 7. Remaining work flagged for next sweeps

**Data layer (sweep 2):**

- `packages/db/src/flooring/imports/staged-inventory-rows/shared.ts` — `stagedInventoryRowSelect` does not include `status`. Add it so the payload type carries the enum.
- `packages/db/src/flooring/imports/staged-inventory-rows/read-repository.ts` — `normalizeStagedInventoryRow` needs to:
  - Drop `String(row.importEntry.importNumber)` and pass through the number directly to `importNumber` (line 43).
  - Switch `itemNumber: row.itemNumber` to handle `string | null` per the now-nullable column (line 54). Domain still expects `string`; either coalesce to `""` (consistent with other empty-string conventions) or push the nullable type into the domain row in a later sweep.
  - Add `status: row.status` to the returned literal so the new required field is set.
- `packages/db/src/flooring/inventory/shared.ts` — `inventoryRowSelect` does not select `inventoryNumber`. Add it.
- `packages/db/src/flooring/inventory/read-repository.ts` — `normalizeInventoryRow` needs to add `inventoryNumber: payload.inventoryNumber` to the returned literal, and resolve the `itemNumber: payload.itemNumber` `string | null` mismatch at line 111.
- `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:149` — fix the `"VOIDED"` literal to the new `VOID` enum value, and ensure `patch.status` flows the enum type rather than a wide string. (Cut-logs is out of this sweep's scope but flagged for completeness.)

**Application layer (sweep 3):**

The audit's Section 5.2 enumerates the existing breakage; nothing new from this sweep adds to that list. Highlights still owed:

- `packages/application/src/flooring/imports/update-import.ts` — drop the `transportType` / `status` references (no such fields on `ImportPrimaryForm`); rename db imports to the `*Record` suffix; drop the non-existent `isImportStatus` / `isImportTransportType` domain helpers.
- `packages/application/src/flooring/imports/create-import.ts` — same db-rename + drop transportType/status.
- `packages/application/src/flooring/imports/delete-import.ts` — rename `deleteImportById` → `deleteImportRecordById`; replace `getImportDeleteState` with `countStagedInventoryByImportId` + `countLiveInventoryByImportId` composition (or add a dedicated read helper in the data layer).
- `packages/application/src/flooring/imports/save-inventory-rows.ts` — `applyImportInventoryRowsDiff` does not exist; sweep 3 needs to decide whether to introduce it or rewire to the staged-row diff applier.
- `packages/application/src/flooring/inventory/{create,update,delete}-inventory.ts` — rename `*Inventory` → `*InventoryRecord`; drop the missing domain helpers (`describeInventoryValidationIssues`, `validateInventoryInput`, `isImportedReversal`); drop `current.isImported` / `input.isImported` (inventory has no such field anymore).
- Wire the new `parseImportMaterializeBatchPayload` into a new `queueStagedImportBatchUseCase` (or equivalent) that reads the new `IMPORT_MATERIALIZE_TOPIC` constant and writes to the outbox via `@builders/db`'s `outbox-repository`.
- Wire the new status-aware predicates (`isStagedRowEditable`, `canDeleteStagedRow`) into the staged-row diff-save and delete paths once they exist.

**App routes / modules:** errors enumerated in the audit Section 5.2 + the captured tsc output remain; not introduced by this sweep.
