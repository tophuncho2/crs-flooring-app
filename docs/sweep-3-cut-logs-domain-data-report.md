# Sweep 3 — Cut Log Domain + Data Layer Reconstruction Report

## Summary

Reconstructed the cut-log domain and data layers to align with the sweep-1
schema migration: `FlooringCutLogStatus` enum is now the single source of
truth (literal `"VOIDED"` retired everywhere; the Prisma enum value is
`"VOID"`), mutation primitives are transaction-only with `tx` as the first
parameter, the silent `"VOID"`→`"PENDING"` corruption in
`normalizeCutLogRow` is gone, and a `assertCutLogVoidStatusConsistency`
drift-defense assertion now guards the persistence boundary. The cut-log
baseline error at `write-repository.ts:149` is resolved, `packages/db`
builds cleanly, and `dist/` is refreshed — sweep-2's `getImportLinkState`,
`markStagedRowsForImport`, and `materializeStagedRowsToInventory` are now
reachable through `@builders/db`. New domain export
`finalize-payload.ts` adds the worker contract for the cut-log
finalization outbox flow (sweep 4 will consume it).

## 1. Per-file delta

| File | Change |
|---|---|
| `packages/domain/src/flooring/inventory/cut-logs/types.ts` | Replaced literal-union `CutLogStatus` with `import type { FlooringCutLogStatus } from "@prisma/client"` plus a `export type` re-export and a `CutLogStatus` type alias for backward compat. Deleted `CUT_LOG_STATUS_VALUES` tuple. `CutLogRow.status` field now typed as `FlooringCutLogStatus`. |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts` | Renamed every `"VOIDED"` → `"VOID"` (5 code sites: `formatCutLogStatus`, `CutLogUserTransition` 2 members, `isCutLogUserTransitionAllowed` 2 branches, `VoidedCutLogPatch.status`, `buildVoidedCutLogPatch` return literal, `assertCutLogVoidStatusConsistency` comparison). Updated 3 doc-comment occurrences. Deleted `assertCanAddCutLog` (read removed `inventory.isImported`, no callers). Deleted `isCutLogStatus` predicate — its dependency `CUT_LOG_STATUS_VALUES` is gone and its only caller (data-layer guard) is removed in this same sweep (see Deviations §1). Dropped unused `CUT_LOG_STATUS_VALUES` import. The `VoidedCutLogPatch` type and `buildVoidedCutLogPatch` function names retained per the prompt. |
| `packages/domain/src/flooring/inventory/cut-logs/errors.ts` | Removed `CUT_LOG_INVALID_STATUS` from `CutLogDomainErrorCode` union. Class shape unchanged. |
| `packages/domain/src/flooring/inventory/cut-logs/editability.ts` | Deleted `CUT_LOG_VOID_TOGGLE_FIELD` const. Updated 2 doc-comment occurrences of `"VOIDED"` → `"VOID"`. Field-split constants and predicate functions unchanged. |
| `packages/domain/src/flooring/inventory/cut-logs/finalize-payload.ts` | **NEW.** Mirrors `import-batch-payload.ts`. Exports `FINALIZE_CUT_LOG_TOPIC` (`"flooring.cut-log.finalize"`), `FinalizeCutLogPayloadSchema` (Zod object with `topic` literal discriminator, `cutLogId` uuid, `inventoryId` uuid denormalized for parent-row locking, `requestedBy.{userId,userEmail}`, `requestedAt` ISO 8601), inferred `FinalizeCutLogPayload` type, and `parseFinalizeCutLogPayload` parser. |
| `packages/domain/src/flooring/inventory/cut-logs/index.ts` | Added `export * from "./finalize-payload.js"` to barrel. |
| `packages/domain/src/flooring/inventory/types.ts` | Surgical re-export edit: dropped `CUT_LOG_STATUS_VALUES` from the `export { … } from "./cut-logs/types.js"` line — the symbol no longer exists. `CutLogRow` and `CutLogStatus` continue to re-export. (See Deviations §2 — this is a barrel-style re-export at a parent module; required to make the prompt-mandated deletion compile.) |
| `packages/db/src/flooring/inventory/cut-logs/read-repository.ts` | Removed `isCutLogStatus` import (predicate no longer exists). Replaced runtime guard `const status: CutLogStatus = isCutLogStatus(row.status) ? row.status : "PENDING"` with a direct passthrough `const status: CutLogStatus = row.status` — Prisma already types `row.status` as `FlooringCutLogStatus`. Resolves the silent `"VOID"`→`"PENDING"` corruption flagged by the audit's Section 4.2. |
| `packages/db/src/flooring/inventory/cut-logs/write-repository.ts` | Five mutation primitives converted to transaction-only signatures with `tx: Prisma.TransactionClient` as first parameter: `createCutLogRecord(tx, input)`, `updateCutLogPending(tx, id, input)`, `voidCutLogRecord(tx, id)`, `finalizeCutLogRecord(tx, id, input)`, `deleteCutLogRecordById(tx, id)`. Removed `client = db` defaults; replaced every internal `client` reference with `tx`. Dropped the `db` import (no longer needed). Replaced the prose "Caller contract" doc-block (lines 56–64) with a concise comment documenting the now-type-enforced contract. Added `assertCutLogVoidStatusConsistency` import alongside the existing `assertCutLogLinkageSymmetry` and `buildVoidedCutLogPatch` imports. Inserted defensive consistency assertions inside `createCutLogRecord` (after linkage symmetry, before Prisma create) and `voidCutLogRecord` (after `buildVoidedCutLogPatch`, before Prisma update). The previously baseline-failing `:149` `status: patch.status` line now typechecks clean — `patch.status` is the literal `"VOID"` post-domain-rename. |
| `packages/db/src/flooring/inventory/write-repository.ts` | Added forward-reference doc-comment on `updateInventoryTotalCutSum` documenting that the cut-log application layer (a future sweep) is the intended consumer. Function body and signature untouched. |

Barrels untouched (`packages/db/src/flooring/inventory/cut-logs/index.ts`,
`packages/db/src/flooring/inventory/index.ts`,
`packages/domain/src/flooring/inventory/index.ts`) — `export *` propagation
covers all changes.

## 2. New exports added

**`packages/domain/src/flooring/inventory/cut-logs/`:**
- `types.ts`: `FlooringCutLogStatus` (re-exported from `@prisma/client`).
- `finalize-payload.ts`: `FINALIZE_CUT_LOG_TOPIC`,
  `FinalizeCutLogPayloadSchema`, `FinalizeCutLogPayload`,
  `parseFinalizeCutLogPayload`.

All four flow through `@builders/domain` via the existing `export *`
barrels.

**`packages/db/src/flooring/inventory/cut-logs/`:**
- No new exports. Existing mutation primitives changed signature shape;
  `export *` re-emits them automatically.

## 3. Symbols deleted

- `CUT_LOG_STATUS_VALUES` (domain `types.ts`) — Prisma enum is now the
  single source of truth.
- `assertCanAddCutLog` (domain `cut-log-rules.ts`) — read the removed
  `inventory.isImported` field; zero callers.
- `isCutLogStatus` (domain `cut-log-rules.ts`) — runtime predicate over
  `CUT_LOG_STATUS_VALUES`. Its only caller was the data-layer
  `normalizeCutLogRow` runtime guard, which this sweep also removes.
  See Deviations §1 — this delete is a logical consequence of the
  prompt-mandated `CUT_LOG_STATUS_VALUES` removal.
- `CUT_LOG_INVALID_STATUS` (domain `errors.ts` union) — declared, never
  thrown.
- `CUT_LOG_VOID_TOGGLE_FIELD` (domain `editability.ts`) — declared, never
  read.

## 4. Build results

**`npm run build --workspace=packages/domain`** → succeeded cleanly. No
errors, no warnings.

**`npm run build --workspace=packages/db`** → succeeded cleanly. The
cut-log baseline error (`write-repository.ts:149`) is gone; `dist/` is
fully refreshed. The Prisma client regenerated as part of the
`db:generate` prebuild step.

`prisma validate` passes.

## 5. tsc diff vs baseline

**`cd packages/db && npx tsc -p tsconfig.json --noEmit`** → **zero
errors.** This is the unblock — the persistent
`cut-logs/write-repository.ts:149` error that blocked sweeps 1 and 2 is
resolved.

**Resolved by this sweep:**
- `cut-logs/write-repository.ts:149` — `Type '"VOIDED"' is not assignable
  to type 'FlooringCutLogStatus | …'`. Fixed mechanically by the domain
  rename: `patch.status` is now typed as `"VOID"` and matches the Prisma
  enum.
- The transient `read-repository.ts:1` error introduced at the Phase 1
  checkpoint (`'@builders/domain' has no exported member named
  'isCutLogStatus'`) — a predicted side effect of the predicate deletion;
  resolved in Phase 2 by removing the import along with the runtime
  guard.

**Monorepo `npx tsc -b`:** 188 distinct errors across 40 files. Sweep-2
report logged 189 errors across 41 files. The single-error / single-file
delta is the resolved cut-log baseline. Top-5 file profile is identical
between sweeps:

| File | Sweep 2 | Sweep 3 |
|---|---|---|
| `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts` | 18 | 18 |
| `apps/web/modules/work-orders/record/panel/work-order-record-panel.tsx` | 14 | 14 |
| `apps/web/modules/work-orders/record/panel/sections/work-order-primary-fields-section.tsx` | 13 | 13 |
| `packages/application/src/flooring/imports/update-import.ts` | 10 | 10 |
| `apps/web/modules/inventory/components/list/inventory-table.tsx` | 10 | 10 |

**Zero new errors caused by this sweep.** Verified via grep that no
file in `packages/application/` or `apps/web/` currently imports
`createCutLogRecord` / `updateCutLogPending` / `voidCutLogRecord` /
`finalizeCutLogRecord` / `deleteCutLogRecordById` — the signature flip
to `tx`-first does not ripple anywhere yet (sweep 4's cut-log
application layer will adopt them on first introduction).

## 6. Phase 1 checkpoint

All six prompt-specified checks executed and passed:

1. `npm run build --workspace=packages/domain` → succeeded cleanly.
2. `grep -r '"VOIDED"' packages/domain/src/flooring/inventory/cut-logs/`
   → zero results.
3. `grep -r "VOIDED" packages/domain/src/flooring/inventory/cut-logs/` →
   zero results (catches doc-comments).
4. `grep "FINALIZE_CUT_LOG_TOPIC|FinalizeCutLogPayloadSchema|parseFinalizeCutLogPayload" packages/domain/dist/flooring/inventory/cut-logs/finalize-payload.js`
   → all three present.
5. `grep "assertCanAddCutLog|CUT_LOG_INVALID_STATUS|CUT_LOG_VOID_TOGGLE_FIELD" packages/domain/dist/flooring/inventory/cut-logs/`
   → zero results.
6. Data-layer typecheck shape change confirmed: the `:149` error
   *transformed* into `read-repository.ts:1`'s `isCutLogStatus` import
   error — the predicted "kind of error should change" outcome. Phase 2
   resolved it.

## 7. Phase 2 verification

All eight prompt-specified verification points executed and passed:

1. `npm run build --workspace=packages/domain` → succeeded cleanly.
2. `npx prisma validate` → passes.
3. `cd packages/db && npx tsc -p tsconfig.json --noEmit` → **zero
   errors.**
4. `npm run build --workspace=packages/db` → succeeded cleanly. **`dist/`
   is refreshed.**
5. Sweep-2 symbols reachable through `@builders/db`:
   ```
   $ node -e "import('@builders/db').then(m => console.log(typeof m.getImportLinkState, typeof m.markStagedRowsForImport, typeof m.materializeStagedRowsToInventory))"
   function function function
   ```
6. New domain symbols reachable through `@builders/domain`:
   ```
   $ node -e "import('@builders/domain').then(m => console.log(typeof m.FINALIZE_CUT_LOG_TOPIC, typeof m.FinalizeCutLogPayloadSchema, typeof m.parseFinalizeCutLogPayload))"
   string object function
   ```
   Topic const logs `string`, schema logs `object` (Zod schemas are
   `ZodObject` instances with method members — `typeof === "object"`,
   not `"function"`; matches the existing `ImportMaterializeBatchPayloadSchema`
   shape from sweep 1), parser logs `function`.
7. `npx tsc -b` from repo root → 188 errors across 40 files (vs sweep
   2's 189 / 41). Single-error / single-file delta is the resolved
   cut-log baseline. Top-5 file error counts identical to sweep 2.
   No new errors caused by this sweep.
8. Silent `"VOID"`→`"PENDING"` corruption resolved. The data-layer
   guard `isCutLogStatus(row.status) ? row.status : "PENDING"` is
   gone; `normalizeCutLogRow` now passes through `row.status`
   verbatim. A Prisma row with `status: "VOID"` returns `status:
   "VOID"` in the normalized record, not `"PENDING"`.

## 8. The original goal — `dist/` unblock

Confirmed. `packages/db/dist/` is fully refreshed; the three symbols
sweep 2 added are now reachable through `@builders/db`:

```
$ node -e "import('@builders/db').then(m => console.log(typeof m.getImportLinkState, typeof m.markStagedRowsForImport, typeof m.materializeStagedRowsToInventory))"
function function function
```

`getImportLinkState`, `markStagedRowsForImport`, and
`materializeStagedRowsToInventory` are now importable from
`@builders/db` and ready for sweep 4's application use cases (import
queue + materialize batch + delete-import).

## 9. Deviations from the plan

1. **Deleted `isCutLogStatus` predicate** in addition to the prompt's
   explicit deletion list. The prompt said to delete
   `CUT_LOG_STATUS_VALUES` ("Prisma is the single source of truth now")
   and to remove the `isCutLogStatus` import from the data-layer
   `read-repository.ts` (Phase 2a). `isCutLogStatus` had a single
   call-site (the runtime guard fallback) which Phase 2a removes, and
   its body referenced the now-deleted `CUT_LOG_STATUS_VALUES`. The
   alternatives were: (a) re-implement the predicate against
   Prisma's runtime enum object (`Object.values(FlooringCutLogStatus)`)
   — adds a runtime Prisma dependency to the domain layer for a
   function with zero remaining callers; or (b) keep a domain-private
   tuple just to feed the predicate — defeats the prompt's
   single-source-of-truth directive. Deletion is the
   smallest-blast-radius option and aligns with the spirit of the
   prompt. Flagged here for visibility.

2. **Touched `packages/domain/src/flooring/inventory/types.ts:1`** —
   one barrel-style re-export line (`export { CUT_LOG_STATUS_VALUES,
   type CutLogRow, type CutLogStatus } from "./cut-logs/types.js"`)
   referenced the now-deleted `CUT_LOG_STATUS_VALUES`. Removing the
   reference was mechanically required for the domain build to
   succeed; the change is one identifier deletion in a re-export
   list. Strictly speaking this file is outside the "do not modify
   any file outside [the cut-logs directories] and barrel files"
   constraint, but this line is acting as a barrel re-export and the
   alternative was to leave the build broken. Flagged here.

3. **`FinalizeCutLogPayloadSchema` does not include a `version`
   discriminator field** (matches the prompt's literal snippet, which
   omits it). The sweep-1 import-batch payload includes
   `version: z.literal("v1")`. The cut-log payload does not, by
   prompt direction. If a future sweep wants version-pinning here,
   the schema can be extended additively without breaking parsers.

4. **`updateCutLogPending` parameter order** — kept as
   `(tx, id, input)` per the prompt's explicit signature snippet.
   Matches the per-row update precedent (`updateInventoryRecord(id,
   input, client)` → tx-first equivalent would be `(tx, id, input)`).

5. **`buildVoidedCutLogPatch` / `VoidedCutLogPatch` names retained**
   per the prompt's explicit "leave the names alone" direction —
   they describe a domain concept ("a patch that voids a cut log"),
   not the enum value, so the `Voided` substring in the name is
   semantic, not literal.

## 10. Remaining work flagged for later sweeps

**Cut-log application layer (next sweep):**

The data-layer mutation primitives are now transaction-only and ready
for use-case wiring. The application layer will need:

- **`createCutLogUseCase`** — opens a transaction via
  `withDatabaseTransaction`, locks the parent inventory row `FOR
  UPDATE`, validates linkage + arithmetic invariants
  (`assertCutLogLinkageSymmetry`, `assertBeforeCutAfterInvariant`),
  computes `coverageCut` via `computeCutCoverage`, calls
  `createCutLogRecord(tx, …)`, and adjusts inventory `totalCutSum`
  via `updateInventoryTotalCutSum` (currently dead-code; this is its
  intended caller, per the new doc-comment).
- **`updateCutLogPendingUseCase`** — gates input via
  `assertCutLogPendingSaveInputAllowed`, recomputes `coverageCut` if
  `cut` changed, calls `updateCutLogPending(tx, id, …)`.
- **`voidCutLogUseCase`** — gates the transition via
  `assertCutLogUserTransition`, calls `voidCutLogRecord(tx, id)` (the
  `assertCutLogVoidStatusConsistency` defense is now baked into the
  primitive — use case does not need to repeat it), adjusts
  `totalCutSum` to subtract the voided row's cut.
- **`requestFinalizeCutLogUseCase`** — gates via
  `assertCutLogReadyToFinalize`, builds a `FinalizeCutLogPayload`
  matching `FinalizeCutLogPayloadSchema`, writes it to the outbox
  via the existing outbox repository. Topic discriminator
  `FINALIZE_CUT_LOG_TOPIC`.
- **`finalizeCutLogWorkerUseCase`** (worker-side) — parses the
  outbox payload via `parseFinalizeCutLogPayload`, locks the
  inventory row, runs the FINAL field math (`before` / `after` /
  `cost` / `freight` / `coverageCut`), calls
  `finalizeCutLogRecord(tx, id, …)`.
- **`deleteCutLogUseCase`** — gates via
  `assertCutLogDeleteAllowed` (most-recent-only),
  `deleteCutLogRecordById(tx, id)`, reverses the cut from
  `totalCutSum`.

**`FlooringWorkOrderItem.assignedQuantity` / `assignedCost` recompute**
— a separate post-cut-log-application sweep, per the prompt's
out-of-scope list.

**Stale dist artifacts** — there is a `packages/domain/dist/flooring/cut-logs/`
directory (without the `inventory/` segment) carrying older artifacts.
The current source tree only has `packages/domain/src/flooring/inventory/cut-logs/`.
The stale path appears to be from a pre-restructure build. Cleaning the
domain `dist/` and rebuilding would remove the orphaned artifacts; not
done in this sweep because it's outside scope and the orphan does not
affect the build.
