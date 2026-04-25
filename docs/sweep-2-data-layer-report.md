# Sweep 2 — Data Layer Reconstruction Report

## Summary

Aligned the data layer for `imports/`, `imports/staged-inventory-rows/`, and `inventory/` with sweep-1 schema + domain. Resolved all 4 visible and 2 latent tsc errors from the previous sweep's report (in `packages/db`'s source). Added three new exports the application layer (sweep 3) will consume: `getImportLinkState`, `markStagedRowsForImport`, `materializeStagedRowsToInventory`.

**Critical caveat:** the `packages/db` build still fails — and `dist/` is not refreshed — because of the pre-existing cut-log baseline error at `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:149`. That file was explicitly off-limits in this sweep's scope. Source typechecks cleanly via `tsc --noEmit`; sweep 3 cannot import the new symbols from `@builders/db` until the cut-log fix lands. See "Blocker" section.

## 1. Per-file delta

| File | Change |
|---|---|
| `packages/db/src/flooring/imports/read-repository.ts` | Added `ImportLinkStateRecord` type + `getImportLinkState(id, client)` function. Returns `{ stagedInventoryRowCount, liveInventoryRowCount } \| null` — field names match domain `ImportLinkState` for direct pass-through to `isImportDeleteBlocked` / `isImportWarehouseChangeBlocked`. Single Prisma `findUnique` with `_count` selection. Returns `null` when the import doesn't exist (matches the `getInventoryDeleteState` precedent). The existing `countStagedInventoryByImportId` and `countLiveInventoryByImportId` are kept untouched. |
| `packages/db/src/flooring/imports/staged-inventory-rows/shared.ts` | Added `status: true` to `stagedInventoryRowSelect`, between `isImported` and `cost`. `StagedInventoryRowPayload` now carries `status: FlooringStagedRowStatus` automatically via `GetPayload`. |
| `packages/db/src/flooring/imports/staged-inventory-rows/read-repository.ts` | Three normalizer changes inside `normalizeStagedInventoryRow`: (1) `importNumber: row.importEntry.importNumber` (dropped the `String(...)` coercion — domain type is `number` since sweep 1); (2) `itemNumber: row.itemNumber ?? ""` (column is now nullable, coalesce to empty string per the established convention); (3) added `status: row.status` next to `isImported` in the returned literal. |
| `packages/db/src/flooring/imports/staged-inventory-rows/write-repository.ts` | `CreateStagedInventoryRecordInput.itemNumber` widened from `string` to `string \| null` (schema column is nullable). `UpdateStagedInventoryRecordInput` already inherits from `Partial<...>` so the new permitted-null propagates. **Added** `MarkStagedRowsForImportInput`, `MarkStagedRowsForImportResult`, and `markStagedRowsForImport(tx, input)` — transaction-only batch primitive that pre-reads eligible rows (status=DRAFT, isImported=false, matching importEntryId), bulk-updates them to (status=QUEUED, isImported=true), and returns precise marked/skipped ID lists. Doc-comment documents the parent-import `FOR UPDATE` lock contract. |
| `packages/db/src/flooring/inventory/shared.ts` | Added `inventoryNumber: true` to `inventoryRowSelect` (next to `id`). `inventoryDetailSelect` inherits via spread. `InventoryRowPayload` now carries `inventoryNumber: string`. |
| `packages/db/src/flooring/inventory/read-repository.ts` | Two normalizer changes inside `normalizeInventoryRow`: (1) added `inventoryNumber: payload.inventoryNumber` immediately after `id` (resolves the latent `TS2740` flagged in sweep-1 report); (2) `itemNumber: payload.itemNumber ?? ""` (column is now nullable, coalesce per established convention). |
| `packages/db/src/flooring/inventory/write-repository.ts` | `CreateInventoryRecordInput.itemNumber` widened from `string` to `string \| null`. `UpdateInventoryRecordInput.itemNumber?` widened from `string` to `string \| null` (allows clearing). **Added** `MaterializeStagedRowsToInventoryInput`, `MaterializeStagedRowsToInventoryResult`, and `materializeStagedRowsToInventory(tx, input)` — transaction-only batch primitive that bulk-inserts inventory rows from caller-pre-assigned UUIDs, re-reads to surface DB-assigned `inventoryNumber` values, then atomically flips the source staged rows from QUEUED to IMPORTED. Doc-comment documents the pre-assigned-id and parent-lock contracts. |
| `packages/db/src/flooring/imports/index.ts` | **Untouched.** `export *` propagates new symbols. |
| `packages/db/src/flooring/imports/staged-inventory-rows/index.ts` | **Untouched.** Same. |
| `packages/db/src/flooring/inventory/index.ts` | **Untouched.** Same. |
| `packages/db/src/index.ts` | **Untouched.** Re-exports both `flooring/imports` and `flooring/inventory` already; new symbols flow up. |

## 2. New exports added (surfaced through `@builders/db`)

**Read primitive:**
- `getImportLinkState(id, client?)` → `Promise<ImportLinkStateRecord | null>`
- `ImportLinkStateRecord` type

**Staged batch primitive:**
- `markStagedRowsForImport(tx, input)` → `Promise<MarkStagedRowsForImportResult>`
- `MarkStagedRowsForImportInput`, `MarkStagedRowsForImportResult` types

**Inventory bulk-materialization primitive:**
- `materializeStagedRowsToInventory(tx, input)` → `Promise<MaterializeStagedRowsToInventoryResult>`
- `MaterializeStagedRowsToInventoryInput`, `MaterializeStagedRowsToInventoryResult` types

All three flow through the existing nested barrel structure without explicit `index.ts` edits.

## 3. Symbols deleted

**None.** Every `*Record` per-row primitive (`createImportRecord`, `updateImportRecord`, `updateImportPercent`, `deleteImportRecordById`, `createInventoryRecord`, `updateInventoryRecord`, `updateInventoryTotalCutSum`, `deleteInventoryRecordById`, `createStagedInventoryRecord`, `updateStagedInventoryRecord`, `deleteStagedInventoryRecordById`, `applyStagedInventoryRowsDiff`) is preserved per the audit's documented `*Record` convention. The new bulk primitives sit alongside the per-row primitives — the diff-applier precedent.

## 4. `npm run build --workspace=packages/db` result

**Failed** — same single error as sweep-1 baseline:

```
src/flooring/inventory/cut-logs/write-repository.ts(149,7): error TS2820: Type '"VOIDED"' is not assignable to type 'FlooringCutLogStatus | EnumFlooringCutLogStatusFieldUpdateOperationsInput | undefined'. Did you mean '"VOID"'?
```

The base tsconfig has `noEmitOnError: true`, so `dist/` is not refreshed. **The new symbols added in this sweep are present in source but not in `packages/db/dist/`.** Verified by grep: `dist/` does not contain `getImportLinkState`, `markStagedRowsForImport`, or `materializeStagedRowsToInventory`.

This is the documented baseline failure that this sweep was explicitly told to leave alone. See "Blocker" section.

## 5. `tsc --noEmit` diff vs baseline

`prisma validate` → passes.

**`packages/db` typecheck** (`cd packages/db && npx tsc -p tsconfig.json --noEmit`):

```
src/flooring/inventory/cut-logs/write-repository.ts(149,7): error TS2820: Type '"VOIDED"' is not assignable to type 'FlooringCutLogStatus | EnumFlooringCutLogStatusFieldUpdateOperationsInput | undefined'. Did you mean '"VOID"'?
```

**Resolved from sweep-1 baseline (3 visible):**
- `staged-inventory-rows/read-repository.ts:43` — was the `String(importNumber)` bridge introduced by sweep 1's domain change. Now fixed via raw passthrough.
- `staged-inventory-rows/read-repository.ts:54` — was `itemNumber: row.itemNumber` against a now-nullable column. Now `?? ""`.
- `inventory/read-repository.ts:111` — was `itemNumber: payload.itemNumber` against a now-nullable column. Now `?? ""`.

**Resolved from sweep-1 latent (2):**
- `inventory/read-repository.ts:90` — `normalizeInventoryRow` was missing `inventoryNumber`. Now set.
- `staged-inventory-rows/read-repository.ts:40` — `normalizeStagedInventoryRow` was missing `status`. Now set.

**Remaining (1):**
- `cut-logs/write-repository.ts:149` — pre-existing baseline. Out of scope.

**Monorepo `tsc -b`:** 189 distinct errors across 41 files. Diffed against the sweep-1 report's persisted `tsc -b` output (177 errors across 38 files via `tail -200` — truncated). After de-truncating, top-5 file error counts are identical between sweeps:

| File | Sweep 1 | Sweep 2 |
|---|---|---|
| `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts` | 18 | 18 |
| `apps/web/modules/work-orders/record/panel/work-order-record-panel.tsx` | 14 | 14 |
| `apps/web/modules/work-orders/record/panel/sections/work-order-primary-fields-section.tsx` | 13 | 13 |
| `packages/application/src/flooring/imports/update-import.ts` | 10 | 10 |
| `apps/web/modules/inventory/components/list/inventory-table.tsx` | 10 | 10 |

The 3 file-list additions in this sweep (`packages/application/src/flooring/imports/{create,delete}-import.ts` and `packages/db/src/flooring/inventory/cut-logs/write-repository.ts`) were all surfaced in the sweep-1 audit Section 5.2 as pre-existing — they fell below the prior `tail -200` truncation cutoff. **Zero new errors caused by this sweep.**

## 6. Deviations from the plan

1. **Plan-mode `docs/` copy executed at step 0.** Confirmed: `docs/sweep-2-data-layer-plan.md` exists (501 lines, byte-identical to `~/.claude/plans/task-plan-the-temporal-simon.md`).

2. **`materializeStagedRowsToInventory` `MaterializeStagedRowsToInventoryInput`** — adopted the spec's revised shape with caller-pre-assigned `id` on each row entry (the open-question item 2 in the plan). The plan flagged this contract for review; I went with it as the default since the alternative (DB-side ID assignment + per-row re-read) is meaningfully slower and less symmetric with the `applyStagedInventoryRowsDiff` precedent. **Sweep 3 will need to honor the pre-assigned-id contract.**

3. **`createInventoryRecord.itemNumber` updated to `string | null`** per Item 3.3a — same change planned, no surprises.

4. **No `getInventoryByIdWithLock` added.** Per Item 3.2f — deferred to the cut-log sweep.

5. **`ApplyStagedInventoryRowsDiffInput.added[].itemNumber` left as `string`** (not widened to `string | null`). The diff applier is the user-facing edit path; the form-shape convention treats blank input as `""` not `null`. Widening here would invite the question "what does null mean from a UI perspective?" — answer: nothing, the UI never sends it. Kept narrow. Sweep 3 will not encounter this since user diffs flow through this entry point unchanged.

## 7. Blocker for sweep 3 — cut-log build gate

Sweep 3 (application use-case rebuild) will need to import `getImportLinkState`, `markStagedRowsForImport`, and `materializeStagedRowsToInventory` from `@builders/db`. Currently those symbols are **only in `packages/db/src/`** — they're not in `packages/db/dist/` because the cut-log baseline error at `cut-logs/write-repository.ts:149` blocks `tsc` emission package-wide (`noEmitOnError: true`).

**Three options for sweep 3 (or a tiny pre-sweep):**

1. **Surgical cut-log line fix** — change `status: "VOIDED"` to `status: "VOID"` in `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:151` (and the matching shape `:136`), or change `status: patch.status` to a typed expression at `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:149`. One-character domain rename matches the sweep-1 enum migration. **Recommended** — this is enum housekeeping that should have happened in the migration sweep but didn't.
2. **Temporarily flip `noEmitOnError: false`** in `packages/config/tsconfig.base.json` for the duration of sweep 3. Hacky and risks shipping broken `dist/`s elsewhere.
3. **Defer sweep 3** until the cut-log sweep ships. Cleanest separation but blocks the import / inventory feature on cut-log work that may have its own scope creep.

I recommend option 1 as a one-commit gate before sweep 3. The change is small, mechanical, and matches the schema migration's intent.

## 8. Remaining work flagged for later sweeps

**Pre-sweep-3 gate (above):** unblock `packages/db/dist/` emission via the cut-log enum rename.

**Application layer (sweep 3):**
- Wire `getImportLinkState` into `delete-import.ts`, replacing the non-existent `getImportDeleteState` symbol. Result is structurally compatible with the domain's `ImportLinkState` so the existing `isImportDeleteBlocked(state)` call needs no remapping.
- Rename use-case-side data calls from `createImport` / `updateImport` / `deleteImportById` / `createInventory` / `updateInventory` / `deleteInventoryById` to their `*Record` equivalents.
- Drop the stale `transportType` / `status` fields from `CreateImportInput` / `UpdateImportInput` (no such columns on `FlooringImportEntry`).
- Drop the stale `isImportedReversal`, `isImportStatus`, `isImportTransportType`, `validateInventoryInput`, `describeInventoryValidationIssues` references — none exist in domain.
- Drop the stale `current.isImported` reference at `update-inventory.ts:41` (column is gone from `FlooringInventory`).
- Decide whether `createInventoryUseCase` survives at all — if user-facing inventory creation is no longer a thing, delete the use case and route. If kept, treat it as an admin/test escape hatch.
- New use case: `queueStagedImportBatchUseCase` orchestrating the `parseImportMaterializeBatchPayload` (sweep 1) + `markStagedRowsForImport` (sweep 2) + outbox-write flow.
- New use case (worker-facing): `materializeImportBatchUseCase` orchestrating staged → inventory field math + `materializeStagedRowsToInventory` (sweep 2). Application layer owns: per-row UUID assignment, `costPerUnit = cost / startingStock`, coverage-rule branching via `categorySupportsCoverageComputation`, `fifoReceivedAt` stamping.

**App routes / modules (sweep 4+):** errors enumerated in sweep-1 audit Section 5.2 + monorepo `tsc -b` output. Nothing new from this sweep.

**Cut-logs sweep (separate):** the entire `inventory/cut-logs/` data + domain + application + UI alignment with the new `FlooringCutLogStatus` enum. Includes the `:149` patch. Out of this sweep's scope by explicit constraint.

## 9. Verification (executed)

1. `cd packages/db && npx prisma validate` → ✓ passes.
2. `cd packages/db && npx tsc -p tsconfig.json --noEmit` → only `cut-logs/write-repository.ts:149` remains.
3. `npm run build --workspace=packages/db` → fails on the cut-log baseline only (`dist/` not emitted — see Blocker).
4. `npx tsc -b` from repo root → 189 errors total; identical top-file profile to sweep 1; zero new errors caused by this sweep.
5. New symbol presence in source: `grep -l "export.*function getImportLinkState\|export.*function markStagedRowsForImport\|export.*function materializeStagedRowsToInventory" packages/db/src/ -r` → confirmed in three expected files.
6. New symbol presence in `dist/` → ✗ (blocked by cut-log; see Blocker).
