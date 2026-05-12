# Cut-Logs Sweep — Application Layer

## Context

Domain + data layers landed: new snapshot columns wired into `CutLogRow` / `CutLogParentContext`, lock helper centralized at `packages/db/src/flooring/inventory/cut-logs/locks.ts`, and every cut-log read/write primitive consolidated at `packages/db/src/flooring/inventory/cut-logs/`. The data layer accepts `location` on insert/update/finalize, accepts WO/WOMI link patches on update-pending, and `buildVoidedCutLogPatch()` already returns the link-clear + location-clear shape.

Application layer currently has 2 type errors (the entry points), 1 lock-helper bypass (void use case), and a hard assumption that every cut-log mutation flows through a WO route. This sweep:

1. **Threads the new snapshot fields + `location` through every use case** (fixes the 2 known type errors at `create-pending-cut-log.ts:121` and `:135`).
2. **Adds link editing to `update-pending-cut-log`** (grouped `link` patch, both-or-neither).
3. **Fixes the void use case** to call `lockInventoryForCutLog` instead of inlining the same SQL; adds a small data primitive `applyVoidToCutLog` so the void persistence lives in the write-repo alongside the other cut-log primitives.
4. **Makes update / delete / void / finalize callable from the inventory side** (discriminated `scope` input — same use case serves WO routes and the upcoming inv routes).
5. **Relocates + renames** to match the data layer's canonical home:
   - `packages/application/src/flooring/work-orders/cut-logs/` → `packages/application/src/flooring/cut-logs/`
   - `voidWorkOrderCutLogUseCase` → `voidCutLogUseCase`
   - `finalizeWorkOrderCutLogUseCase` → `finalizeCutLogUseCase`
   - `WorkOrderCutLogExecutionError` → `CutLogExecutionError`
   - Error codes `WORK_ORDER_CUT_LOG_*` → `CUT_LOG_*`

The existing API routes under `/api/work-orders/[id]/cut-logs/*` stay at the same URLs but get import-path + input-shape updates to match the renamed use cases. Inv-side API routes (`/api/inventory/[id]/cut-logs/*`) are the next sweep.

## Scope

In scope:
- Application use case rewrites (4 of the 5: create stays WO-only; update/delete/void/finalize get scope discriminators)
- One small data-layer addition: `applyVoidToCutLog` write primitive
- Domain layer: extend `UpdatePendingCutLogPatch` with grouped `link` field
- Existing WO-side API route call-site updates (imports + input shape only — no URL changes, no logic changes there)

Out of scope (deferred):
- New inv-side API routes (next sweep)
- Module dir + side panel unification (`modules/cut-logs/`)
- Drop `flooring_cut_log.inventoryItem` composed column

## Behavioral spec

| Use case | WO-callable | Inv-callable | Snapshot writes | Mirror writes | Link patch | Notes |
|---|---|---|---|---|---|---|
| `createPendingCutLogUseCase` | yes | **no** (cut logs only created through WOMIs) | stamps `inventoryItem` + 5 new primitives + 4 unit labels | stamps `location` | both required (create has both-or-error) | already partially wired — fixing the 2 known type errors |
| `updatePendingCutLogUseCase` | yes | yes | none (frozen) | re-stamps `location` unconditionally | both-or-neither; null pair = unlink; symmetric pair = re-link or change | also accepts `cut` / `isWaste` / `notes` patch fields |
| `deletePendingCutLogUseCase` | yes | yes | n/a | n/a | n/a | PENDING-only (uses existing rule); hard delete |
| `voidCutLogUseCase` | yes | yes | none (frozen, including on void) | clears `location → null` (via void patch) | clears both `workOrderId → null` + `workOrderItemId → null` (via void patch) | allowed on PENDING or FINAL; QUEUED + already-VOID rejected |
| `finalizeCutLogUseCase` | yes | yes | none (frozen) | re-stamps `location` (already wired in data layer) | none | PENDING-only |

State → editable fields:
- PENDING: cut, isWaste, notes, link (the 4 form fields)
- FINAL: none (void-only transition)
- VOID: none (terminal)

## File-by-file changes

### 0. Setup — relocate + rename

```bash
git mv packages/application/src/flooring/work-orders/cut-logs \
       packages/application/src/flooring/cut-logs
git mv packages/application/src/flooring/cut-logs/void-work-order-cut-log.ts \
       packages/application/src/flooring/cut-logs/void-cut-log.ts
git mv packages/application/src/flooring/cut-logs/finalize-work-order-cut-log.ts \
       packages/application/src/flooring/cut-logs/finalize-cut-log.ts
```

Update barrel: `packages/application/src/flooring/cut-logs/index.ts` re-exports from the renamed files. Drop the `work-orders/cut-logs/` path from `packages/application/src/index.ts` (or wherever the package barrel re-exports module roots).

After the move, the directory holds:
```
packages/application/src/flooring/cut-logs/
├── index.ts
├── types.ts
├── errors.ts
├── create-pending-cut-log.ts
├── update-pending-cut-log.ts
├── delete-pending-cut-log.ts
├── void-cut-log.ts
└── finalize-cut-log.ts
```

### 1. `packages/application/src/flooring/cut-logs/types.ts` — scope discriminator + input shapes

Add a shared `CutLogMutationScope` discriminated union:
```ts
export type CutLogMutationScope =
  | { kind: "work-order"; workOrderId: string }
  | { kind: "inventory"; inventoryId: string }
```

Input shape changes (the domain types re-exported here today get replaced by application-owned shapes):

```ts
export type CreatePendingCutLogInput = {
  // Create is WO-only; no scope discriminator. Both link ids required.
  workOrderId: string
  workOrderItemId: string
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
}

export type UpdatePendingCutLogInput = {
  scope: CutLogMutationScope
  cutLogId: string
  expectedUpdatedAt: string
  patch: {
    cut?: string
    isWaste?: boolean
    notes?: string
    /**
     * Grouped link patch — both-or-neither per
     * `assertCutLogLinkageSymmetry`. Absent leaves links untouched;
     * `{ workOrderId: null, workOrderItemId: null }` unlinks;
     * `{ workOrderId: "...", workOrderItemId: "..." }` re-links.
     */
    link?: { workOrderId: string | null; workOrderItemId: string | null }
  }
}

export type DeletePendingCutLogInput = {
  scope: CutLogMutationScope
  cutLogId: string
  expectedUpdatedAt: string
}

export type VoidCutLogInput = {
  scope: CutLogMutationScope
  cutLogId: string
}

export type FinalizeCutLogInput = {
  scope: CutLogMutationScope
  cutLogId: string
}

export type CutLogMutationResult = {
  cutLog: CutLogRecord
  inventoryId: string
  totalCutSum: string  // omitted on finalize (totalCutSum unchanged by finalize)
}
```

Drop the re-exports of domain input types (the old ones are no longer used — application owns the contract now).

### 2. `packages/application/src/flooring/cut-logs/errors.ts` — rename + scope-neutral codes

```ts
export type CutLogExecutionErrorCode =
  | "CUT_LOG_VALIDATION_FAILED"
  | "CUT_LOG_NOT_FOUND"
  | "CUT_LOG_SCOPE_MISMATCH"        // replaces WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH
  | "CUT_LOG_VOID_NOT_ALLOWED"
  | "CUT_LOG_DELETE_NOT_ALLOWED"
  | "CUT_LOG_NOT_PENDING"
  | "CUT_LOG_STALE"
  | "CUT_LOG_FINALIZE_BLOCKED"

export class CutLogExecutionError extends Error { /* same shape as today */ }
```

Note: at the route level today there is also a flooring-specific error-mapper that catches `WorkOrderCutLogExecutionError`. That mapper file needs the rename too — flag during execution.

### 3. Shared scope-assertion helper (private to the application module)

Inside `packages/application/src/flooring/cut-logs/`, add a small private helper used by the 4 scope-aware use cases:

```ts
// internal — not exported from the barrel
function assertCutLogScope(
  scope: CutLogMutationScope,
  row: { workOrderId: string | null; inventoryId: string },
): void {
  if (scope.kind === "work-order") {
    if (row.workOrderId !== scope.workOrderId) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_SCOPE_MISMATCH",
        message: "Cut log does not belong to this work order",
        status: 400,
        payload: {
          providedWorkOrderId: scope.workOrderId,
          actualWorkOrderId: row.workOrderId,
        },
      })
    }
  } else {
    if (row.inventoryId !== scope.inventoryId) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_SCOPE_MISMATCH",
        message: "Cut log does not belong to this inventory",
        status: 400,
        payload: {
          providedInventoryId: scope.inventoryId,
          actualInventoryId: row.inventoryId,
        },
      })
    }
  }
}
```

Live in `packages/application/src/flooring/cut-logs/scope.ts` (not exported from `index.ts`).

### 4. `create-pending-cut-log.ts` — thread new fields, fix the 2 known type errors

Two edits — both at the `insertPendingCutLogRow` call site (~line 121-139):

(a) `getInventoryParentContextForCutLogs` already returns the 6 new fields after the data sweep. Use them.

(b) Update the call to `insertPendingCutLogRow`:

```ts
const cutLog = await insertPendingCutLogRow(c, {
  workOrderId: input.workOrderId,
  workOrderItemId: input.workOrderItemId,
  inventoryId: input.inventoryId,
  cut: input.cut,
  coverageCut,
  isWaste: input.isWaste,
  notes: input.notes,
  unitSnapshot: {
    stockUnitName: inventory.stockUnitName,
    stockUnitAbbrev: inventory.stockUnitAbbrev,
    itemCoverageUnitName: inventory.itemCoverageUnitName,
    itemCoverageUnitAbbrev: inventory.itemCoverageUnitAbbrev,
  },
  inventorySnapshot: buildPendingCutLogInventorySnapshot({
    inventoryItem: inventory.inventoryItem,
    categorySlug: inventory.categorySlug,
    inventoryNumber: inventory.inventoryNumber,
    rollPrefix: inventory.rollPrefix,
    rollNumber: inventory.rollNumber,
    dyeLot: inventory.dyeLot,
    inventoryNote: inventory.inventoryNote,
  }),
  location: inventory.location,
})
```

Update import + error-class references:
- `WorkOrderCutLogExecutionError` → `CutLogExecutionError`
- Error codes `WORK_ORDER_CUT_LOG_*` → `CUT_LOG_*`

No scope discriminator — create is WO-only.

### 5. `update-pending-cut-log.ts` — scope + link editing + location re-snap

Rewrite to consume the new `UpdatePendingCutLogInput` shape. Flow:

1. Open TX, lookup the cut log via `getPendingCutLogWithInventoryForMutation` (which now returns the extended `CutLogParentContext` with 6 new fields).
2. `assertCutLogScope(input.scope, { workOrderId: existing.workOrderId, inventoryId: existing.inventoryId })`
3. `assertCutLogPendingMutationAllowed` (status gate, existing rule — unchanged).
4. `assertCutLogExpectedUpdatedAtMatches` (OCC — existing rule).
5. If `input.patch.link !== undefined`:
   - `assertCutLogLinkageSymmetry(input.patch.link)` (existing rule — throws on asymmetry).
   - Also assert: if `link.workOrderId !== null`, verify the WOMI exists and `WOMI.workOrderId === link.workOrderId` (re-link target validity). Mirrors the WOMI ownership check that create-pending does at line 67-89.
6. Merge patch for form validation: `mergedCut = patch.cut ?? existing.cut`, etc. Run `validateCutLogPendingForm`.
7. `lockInventoryForCutLog(c, existing.inventoryId)`.
8. Build the row patch:
   ```ts
   const patch: UpdatePendingCutLogRowPatch = {}
   if (input.patch.cut !== undefined) {
     patch.cut = input.patch.cut
     patch.coverageCut = deriveCutLogCoverageCutString({...})
   }
   if (input.patch.isWaste !== undefined) patch.isWaste = input.patch.isWaste
   if (input.patch.notes !== undefined) patch.notes = input.patch.notes
   if (input.patch.link !== undefined) {
     patch.workOrderId = input.patch.link.workOrderId
     patch.workOrderItemId = input.patch.link.workOrderItemId
   }
   // ALWAYS re-snap location from parent inventory
   patch.location = inventory.location
   ```
9. `updatePendingCutLogRow(c, { id: existing.id, patch })` — the data primitive already handles the connect/disconnect for the link fields.
10. `recomputeAndPersistTotalCutSums` + `assertCutSumWithinStartingStock` (unchanged).

Note: the `location` re-snap happens **every** update-pending call, regardless of which fields are in the patch. Denormalized-mirror semantics — if the user only edits `notes`, location still moves to track the parent.

### 6. `delete-pending-cut-log.ts` — scope discriminator only

Rewrite to consume `DeletePendingCutLogInput` (scope-discriminated). Flow:

1. `getPendingCutLogWithInventoryForMutation` for the cut log + parent context.
2. `assertCutLogScope(input.scope, existing)`.
3. `assertCutLogPendingMutationAllowed`.
4. `assertCutLogExpectedUpdatedAtMatches`.
5. `lockInventoryForCutLog`.
6. `deletePendingCutLogRow`.
7. `recomputeAndPersistTotalCutSums` + invariant.

No new behavior — just the scope assertion swap.

### 7. `void-cut-log.ts` (renamed) — scope, lock helper, new data primitive

Rewrite to:
1. Load cut log (full record + linkage fields — use a small select, the cut log's full record isn't needed pre-lock).
2. `assertCutLogScope(input.scope, existing)`.
3. `lockInventoryForCutLog(c, existing.inventoryId)` — **replaces the inlined `$queryRaw`**.
4. Re-read the cut log under the lock (or trust step 1's read since we're checking lifecycle predicates).
5. `canVoidCutLog(existing)` — existing predicate; throws `CUT_LOG_VOID_NOT_ALLOWED` (409) on rejection.
6. `applyVoidToCutLog(c, input.cutLogId)` — **new data primitive** (see §10 below). The patch from `buildVoidedCutLogPatch()` (extended in the data sweep to clear links + location) is applied inside.
7. `recomputeAndPersistTotalCutSums` + invariant (unchanged).
8. Return the voided row by re-reading via `getCutLogById`.

### 8. `finalize-cut-log.ts` (renamed) — scope only

`applyFinalizeCutLog` already re-snaps location (wired in the prior sweep). Just:
1. Rewrite to consume `FinalizeCutLogInput` (scope-discriminated).
2. Replace the inlined WO linkage check at line 79-90 with `assertCutLogScope(input.scope, ...)`.
3. Rename use case function: `finalizeWorkOrderCutLogUseCase` → `finalizeCutLogUseCase`.
4. Everything else stays — finalizability gate, defensive `assertBeforeCutAfterInvariant`, re-read via `getCutLogById`.

### 9. `index.ts` — barrel

```ts
export * from "./types.js"
export * from "./errors.js"
export * from "./create-pending-cut-log.js"
export * from "./update-pending-cut-log.js"
export * from "./delete-pending-cut-log.js"
export * from "./void-cut-log.js"
export * from "./finalize-cut-log.js"
// scope.ts NOT exported — it's an internal helper
```

Update `packages/application/src/index.ts` (or wherever the package re-exports the per-module barrels) to reflect the new path.

### 10. Domain — extend `UpdatePendingCutLogPatch`

In `packages/domain/src/flooring/work-orders/cut-logs/types.ts`, extend the WO-side input patch type with the grouped link field:

```ts
export type UpdatePendingCutLogPatch = {
  cut?: string
  isWaste?: boolean
  notes?: string
  link?: { workOrderId: string | null; workOrderItemId: string | null }
}
```

Actually — flag during execution: this type sits at `domain/src/flooring/work-orders/cut-logs/types.ts`, the same WO-side stub directory that was 2 files. After this sweep, that directory may also be a candidate for relocation into `domain/src/flooring/inventory/cut-logs/` (matching the data + application consolidations). Defer the move; just extend the type here for now.

The replacement at the application layer (the new `UpdatePendingCutLogInput` in §1) supersedes consumers of the domain-side type; once routes use the application type, the domain type becomes dead and can be removed in a later cleanup pass.

### 11. Data layer — add `applyVoidToCutLog` write primitive

New function in `packages/db/src/flooring/inventory/cut-logs/write-repository.ts`:

```ts
import { buildVoidedCutLogPatch } from "@builders/domain"
// (buildVoidedCutLogPatch is a pure helper — allowed under the data-layer
//  carve-out in packages/db/CLAUDE.md rule 1)

/**
 * Apply the canonical void patch to a single cut log. The patch from
 * `buildVoidedCutLogPatch` zeros `cut`, nulls `coverageCut`, sets
 * `status: VOID` + `void: true`, clears `workOrderId` / `workOrderItemId`
 * (unlink), and clears `location`. Pure persistence — domain rules run
 * in the use case before this is invoked.
 *
 * Caller has locked the parent inventory FOR UPDATE via
 * `lockInventoryForCutLog`.
 */
export async function applyVoidToCutLog(
  tx: Prisma.TransactionClient,
  cutLogId: string,
): Promise<CutLogRecord> {
  const patch = buildVoidedCutLogPatch()
  await tx.flooringCutLog.update({
    where: { id: cutLogId },
    data: {
      cut: patch.cut,
      coverageCut: patch.coverageCut,
      void: patch.void,
      status: patch.status,
      workOrderId: patch.workOrderId,
      workOrderItemId: patch.workOrderItemId,
      location: patch.location,
    },
    select: { id: true },
  })
  const record = await getCutLogById(cutLogId, tx)
  if (!record) {
    throw new Error(`applyVoidToCutLog: cut log ${cutLogId} not found after void`)
  }
  return record
}
```

This is the only data-layer addition. It restores symmetry with the other write primitives (`insertPendingCutLogRow`, `updatePendingCutLogRow`, `deletePendingCutLogRow`, `applyFinalizeCutLog`) — every state-changing operation now has a named write primitive in the data layer, and the application use case is the orchestrator that calls them around the lock + recompute.

### 12. Existing WO-side API routes — import + input updates only

Four routes need updates. **No URL changes. No logic changes.** Just the function-rename + input-shape ripple.

| Route | File | Change |
|---|---|---|
| POST create | `apps/web/app/api/work-orders/[id]/cut-logs/route.ts` | Update import path; input shape stays (create is WO-only). Update error class name. |
| PATCH | `apps/web/app/api/work-orders/[id]/cut-logs/[cutLogId]/route.ts` | Wrap input: `{ scope: { kind: "work-order", workOrderId: id }, cutLogId, expectedUpdatedAt, patch }`. Validator (`_validators.ts`) gets the grouped `link` shape. |
| DELETE | same file | Wrap with `scope` discriminator. |
| POST void | `apps/web/app/api/work-orders/[id]/cut-logs/[cutLogId]/void/route.ts` | Rename import `voidWorkOrderCutLogUseCase` → `voidCutLogUseCase`. Wrap with `scope`. |
| POST finalize | `apps/web/app/api/work-orders/[id]/cut-logs/finalize/route.ts` | Rename import `finalizeWorkOrderCutLogUseCase` → `finalizeCutLogUseCase`. Wrap with `scope`. |

Validators file `apps/web/app/api/work-orders/_validators.ts`:
- Extend `ValidatedUpdatePendingCutLogPatch` with the grouped `link` field (both-or-neither in the Zod schema).
- Update any `WORK_ORDER_CUT_LOG_*` error-code references to `CUT_LOG_*` if the file maps them.

Route-level error mapper (wherever `WorkOrderCutLogExecutionError` gets caught for HTTP response shaping): rename to `CutLogExecutionError`. Error-code-to-HTTP mapping is otherwise unchanged.

## Critical files (full list)

Edits:
- `packages/domain/src/flooring/work-orders/cut-logs/types.ts` — extend `UpdatePendingCutLogPatch` with `link`
- `packages/db/src/flooring/inventory/cut-logs/write-repository.ts` — add `applyVoidToCutLog`
- `packages/application/src/flooring/cut-logs/types.ts` (new path) — scope discriminator + new input types
- `packages/application/src/flooring/cut-logs/errors.ts` (new path) — rename + scope-neutral codes
- `packages/application/src/flooring/cut-logs/create-pending-cut-log.ts` (new path) — thread new fields
- `packages/application/src/flooring/cut-logs/update-pending-cut-log.ts` (new path) — scope + link + location re-snap
- `packages/application/src/flooring/cut-logs/delete-pending-cut-log.ts` (new path) — scope
- `packages/application/src/flooring/cut-logs/void-cut-log.ts` (renamed) — scope + lock helper + primitive
- `packages/application/src/flooring/cut-logs/finalize-cut-log.ts` (renamed) — scope
- `packages/application/src/flooring/cut-logs/index.ts` — new barrel
- `packages/application/src/index.ts` (or per-module barrel) — update path
- `apps/web/app/api/work-orders/_validators.ts` — link field + code renames
- `apps/web/app/api/work-orders/[id]/cut-logs/route.ts` — imports + error class
- `apps/web/app/api/work-orders/[id]/cut-logs/[cutLogId]/route.ts` — wrap scope
- `apps/web/app/api/work-orders/[id]/cut-logs/[cutLogId]/void/route.ts` — rename + scope
- `apps/web/app/api/work-orders/[id]/cut-logs/finalize/route.ts` — rename + scope
- Route-level error mapper file (location TBD during execution; grep for `WorkOrderCutLogExecutionError`)

New file:
- `packages/application/src/flooring/cut-logs/scope.ts` — internal `assertCutLogScope` helper

Deletes:
- `packages/application/src/flooring/work-orders/cut-logs/` (entire dir, after `git mv`)

## Reused helpers (no new logic needed)

- `lockInventoryForCutLog` at `packages/db/src/flooring/inventory/cut-logs/locks.ts` — already the canonical home; void switches to it.
- `buildVoidedCutLogPatch` at `packages/domain/src/flooring/inventory/cut-logs/rules/cut-log-rules.ts` — already includes link-clear + location-clear from the prior sweep.
- `assertCutLogLinkageSymmetry` at the same path — both-or-neither check; reused by update-pending's link patch handling.
- `assertCutLogPendingMutationAllowed` at `rules/pending-mutation-rules.ts` — PENDING-only gate; unchanged.
- `assertCutLogExpectedUpdatedAtMatches` at the same path — OCC check; unchanged.
- `validateCutLogPendingForm` at `rules/form-rules.ts` — form gate; unchanged.
- `canVoidCutLog` / `canFinalizeCutLog` / `getCutLogFinalizabilityBlocker` at `editability.ts` — lifecycle gates; unchanged.
- `deriveCutLogCoverageCutString` at `math/category-math.ts` — coverage math; unchanged.
- `getInventoryParentContextForCutLogs` + `getPendingCutLogWithInventoryForMutation` at `read-repository.ts` — already returning the 6 new fields after the data sweep; reused as-is.
- `applyFinalizeCutLog` — already re-snaps location.
- `insertPendingCutLogRow` / `updatePendingCutLogRow` / `deletePendingCutLogRow` / `recomputeAndPersistTotalCutSums` — already accept the new shapes.

## Verification

1. **Typecheck** at repo root (in order):
   - `npx tsc -p packages/domain/tsconfig.json` (rebuild dist after the `UpdatePendingCutLogPatch` extension)
   - `npx tsc -p packages/db/tsconfig.json` (rebuild dist after `applyVoidToCutLog` lands)
   - `npx tsc --noEmit -p packages/application/tsconfig.json` → must be **clean** (no remaining errors; the 2 known entry-point errors should be fixed by this sweep)
   - `npx tsc --noEmit -p apps/web/tsconfig.json` → must be **clean** after route updates
2. **Grep verification** (post-sweep):
   - `rg "WorkOrderCutLogExecutionError|voidWorkOrderCutLogUseCase|finalizeWorkOrderCutLogUseCase|WORK_ORDER_CUT_LOG_"` → zero results
   - `rg "from \"@builders/application/.+work-orders/cut-logs\""` → zero results
   - `rg "applyVoidToCutLog"` → 2 results (the data-layer definition + the use case caller)
3. **Lint**: `npm run lint` — no unused imports after the renames + relocations.
4. **Tests** (if any exist for cut-log use cases in `apps/web/tests/` or per-package):
   - Update mocks for renamed function names.
   - Add a scope-mismatch test per use case (cover both `kind: "work-order"` and `kind: "inventory"` paths).
   - Add a link-edit test for `update-pending-cut-log` covering: unlink (null pair), re-link (new pair), asymmetric (rejected), unchanged (absent).
   - Confirm `void-cut-log` test (if any) is updated for the new patch fields (link-clear + location-clear).
5. **FE smoke** (after typecheck passes):
   - Open a WO record page, open the cut-log edit panel, change `cut` only → save → confirm 200 + the `location` mirror updates on the row.
   - Same panel, change WO+WOMI link to a different WOMI on the same WO → save → confirm both fields move together.
   - Void a finalized cut log → confirm 200 + cut log shows as voided + links cleared + location cleared on the row.

## Open question (one, for execution time)

The route-level error mapper that converts `WorkOrderCutLogExecutionError → HTTP response` lives somewhere under `apps/web/` — exact path TBD via grep during execution. Two ways to handle the rename:

- **(a) Rename the catch clause + class import** in the existing mapper file.
- **(b) Re-export the renamed class as the old name** for a transition release — gives a deprecation window without breaking external callers.

**Recommendation: (a).** This is an internal class; there are no external callers; the codebase isn't shipping deprecation cycles. Just rename.

## Deferred (out of scope)

1. **Inv-side API routes** (`/api/inventory/[id]/cut-logs/[cutLogId]/...`) — next sweep. Will reuse the same scope-aware use cases, just passing `{ kind: "inventory", inventoryId }` as scope.
2. **`packages/domain/src/flooring/work-orders/cut-logs/`** stub dir — only holds `types.ts` after this sweep. Candidate for relocation into `domain/src/flooring/inventory/cut-logs/rules/` (matching data + application consolidation). Defer as a small cleanup sweep.
3. **Drop `flooring_cut_log.inventoryItem` composed column** — decide during the FE side-panel sweep, when we know whether anything still consumes the composed string vs render-time composition from the 5 primitives.
4. **`modules/cut-logs/`** extraction + side-panel unification — full FE sweep after API routes land.

## Commit (when this sweep lands)

```
feat(application,db,domain): unify cut-log use cases as scope-neutral;
add applyVoidToCutLog primitive; fix void lock + thread location/snapshots

- Relocate flooring/work-orders/cut-logs → flooring/cut-logs in
  application package; rename void/finalize use cases to drop the
  "WorkOrder" prefix; rename error class + codes to scope-neutral
- Introduce CutLogMutationScope discriminator on update/delete/void/
  finalize so the same use case serves WO routes and the inv-side
  routes landing in the next sweep
- Thread the 5 new inventory-identity snapshot primitives + location
  through create-pending-cut-log (fixes the 2 known type errors)
- Update update-pending-cut-log to accept the grouped link patch
  (both-or-neither) and to always re-snap location from the parent
  inventory regardless of what else is in the patch
- void-cut-log switches from inlined Prisma.sql FOR UPDATE to the
  canonical lockInventoryForCutLog helper; new applyVoidToCutLog
  data primitive centralizes the void persistence alongside
  insert/update/delete/finalize
- Existing WO-side API routes updated for the new use case shapes;
  no URL changes
```
