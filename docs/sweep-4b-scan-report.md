# Sweep 4b — Pre-execution Scan Report

Read-only scan to resolve the three remaining open questions (idempotency
key, parent `expectedUpdatedAt`, error code prefix) and surface
load-bearing facts that aren't in the plan document. The three already
resolved decisions are recorded for completeness; the rest is
new material for the planning conversation.

## Decisions already made (recorded for the execution prompt)

1. **Decision A rejected.** Worker use case opens its own transaction.
   Symmetry with every other use case in the codebase. (Plan §2.)
2. **Relay constraint: option (a).** Sweep 4b writes the outbox event;
   the relay-and-worker revival is a separate sweep before any route
   consumes `markStagedRowsForImportUseCase`. (Plan §1.)
3. **Race handling: option (a).** `markStagedRowsForImportUseCase`
   throws `STAGED_BATCH_RACE` (or `STAGED_INVENTORY_BATCH_RACE` —
   pending §3 of this report) on any non-empty `skippedRowIds`. (Plan
   §3.)

## Three open questions, with scan-grounded recommendations

### 1. Idempotency key — option (b) confirmed; data-layer needs a small change

**Scan findings:**

- Schema confirms `idempotencyKey @unique` on `queue_outbox_event` at
  `packages/db/prisma/schema.prisma:577`. Deterministic key collisions
  fail with Prisma `P2002`.
- `createQueueOutboxEvent` (`packages/db/src/queues/outbox-repository.ts:80`)
  does **not** currently catch `P2002`. A duplicate insertion attempt
  would propagate the raw Prisma error to the caller.
- The application layer already has the `isP2002` helper at
  `packages/application/src/shared/prisma-errors.ts:3`. Six existing
  use cases use it (audit §2.3). Adding the same check inside
  `createQueueOutboxEvent` is the natural fit.
- The relay's BullMQ producer pattern (`addBullMqJobIdempotently` in
  `apps/relay/src/dispatch/bullmq-idempotent-dispatch.ts`) returns
  `{ job, wasDuplicate: boolean }`. Mirroring that signature on the
  outbox producer is symmetric.
- `createQueueOutboxEvent` has **zero** current callers anywhere
  (audit §7.3). Changing the return shape now is risk-free.

**Recommendation:** Option (b), deterministic key. The execution prompt
should also include a small data-layer change: have
`createQueueOutboxEvent` catch `P2002` on the unique `idempotencyKey`
constraint and return either:

- `{ event, wasDuplicate: boolean }` — symmetric with `addBullMqJobIdempotently`. The use case can log "duplicate retry detected" without changing its happy path.
- Or just the existing event silently. Simpler but loses the duplicate signal.

The first form is more flexible. Either is correct.

**Implication for the execution prompt:** the sweep 4b prompt has a
**hidden data-layer task** (~10 lines in `outbox-repository.ts`). Worth
calling out explicitly so the executing agent doesn't get surprised
when the typecheck flags the missing `wasDuplicate` field.

**Idempotency key string:** the plan suggests
`import-materialize:${importEntryId}:${result.markedRowIds.sort().join(",")}`.
With the payload's `stagedRowIds` capped at 500 UUIDs (per
`ImportMaterializeBatchPayloadSchema.stagedRowIds: .max(500)`), the key
is ≤ ~18,500 bytes. Postgres `TEXT` handles that fine. The base64url
BullMQ jobId derived from it is ~24,800 bytes — also fine but worth
sanity-noting (BullMQ accepts long jobIds; Redis keys can be up to 512
MB). No constraint hits.

**Sub-decision the prompt should answer:** does the data-layer
`createQueueOutboxEvent` return `{ event, wasDuplicate }` or just the
event silently? **My pick: `{ event, wasDuplicate }`** — explicit dedup
signal, symmetric with the BullMQ helper.

### 2. `expectedUpdatedAt` on the parent import — include, but the precedent is route-layer not use-case-layer

**Scan findings:**

- `flooring_import_entry.updatedAt @updatedAt` at
  `packages/db/prisma/schema.prisma:353`. Available.
- `expectedUpdatedAt` appears in 17 `apps/web/app/api/...` route
  handlers. In every single instance it's read from the request body
  via `_validators.ts` and passed as a parameter to `withMutationTelemetry`
  (the route-level wrapper at
  `apps/web/modules/shared/engines/common/application/mutation-telemetry.ts`).
  **Zero application use cases currently accept an `expectedUpdatedAt`
  argument.**
- The deleted `saveImportInventoryRowsUseCase` had **per-row**
  `expectedUpdatedAt` inside the use-case body — it never accepted a
  parent-level one. The per-row checks lived in `assertRowVersions` at
  `save-inventory-rows.ts:132-185`.
- Domain types declare `expectedUpdatedAt` only on per-row diff entries
  (`StagedInventoryRowUpdate`, `StagedInventoryRowDelete`,
  `InventoryRowUpdate`, `WarehouseSectionUpdate`, etc.). Parent-level
  `expectedUpdatedAt` lives in route bodies, not domain types.

**Implication:** including `expectedUpdatedAt` as a use-case argument
on `markStagedRowsForImportUseCase` is **a new pattern** for this
codebase. The plan's recommendation (include it) makes the use case
self-defensive but breaks the existing convention where the route
layer owns optimistic-lock receipts.

**Two ways to honor the spirit of the plan's recommendation:**

- **(a) Plan's recommendation, as written:** use case accepts
  `expectedUpdatedAt: string`, fetches `getImportById` inside the
  transaction, throws `STAGED_STALE_ROW_VERSION` on mismatch.
  Establishes a new use-case-level lock-receipt pattern.
- **(b) Route-layer pattern:** use case has no `expectedUpdatedAt`
  arg. The future API route validates `expectedUpdatedAt` via
  `withMutationTelemetry` (or its successor) before calling the use
  case. Stays consistent with every other CRUD route.

The plan says (a). My read of the codebase says (b) is more consistent
with how this codebase handles parent-row staleness today. Both are
defensible.

**My recommendation: option (b) — route-layer staleness check.**

Reasons:
- Consistency with 17 existing route patterns.
- The use case's parent `FOR UPDATE` lock + the data-layer batch
  primitive's eligibility re-check (`markStagedRowsForImport` step 1)
  catches state drift on the staged rows. The parent's `updatedAt` is
  a separate concern from row eligibility.
- Sweep 5's API route is the natural home; the route already handles
  this for every other entity.
- Using (b) doesn't lose anything — sweep 5's route can throw the
  same 409 with the same payload.

If the user prefers (a) regardless, the prompt is still mechanical —
but note this is the **only place** in the codebase where a use case
accepts a parent-level `expectedUpdatedAt`. New convention.

**Sub-decision the prompt should answer:** (a) use-case-owned
`expectedUpdatedAt` or (b) route-layer-owned. **My pick: (b)**, but
this is a design preference, not a correctness issue.

### 3. Error code prefix — domain already committed to `STAGED_*`, not `STAGED_INVENTORY_*`

**Scan findings:**

- The domain module
  `packages/domain/src/flooring/imports/staged-inventory-rows/errors.ts`
  declares `StagedInventoryDomainErrorCode` with **11 codes**, all
  using the `STAGED_*` prefix:
  - `STAGED_VALIDATION_FAILED`
  - `STAGED_DIFF_VALIDATION_FAILED`
  - `STAGED_ROW_LOCKED_POST_IMPORT`
  - `STAGED_LOCATION_WAREHOUSE_MISMATCH`
  - `STAGED_IMPORT_WAREHOUSE_MISMATCH`
  - `STAGED_NOT_IMPORTABLE_ZERO_STOCK`
  - `STAGED_NOT_IMPORTABLE_MISSING_PRODUCT`
  - `STAGED_NOT_IMPORTABLE_MISSING_WAREHOUSE`
  - `STAGED_ROW_NOT_DRAFT`
  - `STAGED_ROW_ALREADY_QUEUED`
  - `STAGED_ROW_BATCH_INELIGIBLE`
- The diff-validator's per-row issue codes (in
  `staged-inventory-rows/diff/types.ts`) also use `STAGED_*`:
  `STAGED_LOCATION_WAREHOUSE_MISMATCH`, `STAGED_IMPORT_WAREHOUSE_MISMATCH`,
  `STAGED_UNKNOWN_PRODUCT`, `STAGED_UNKNOWN_LOCATION`,
  `STAGED_ROW_LOCKED_POST_IMPORT`.
- Every other module in the codebase has **matching prefixes between
  domain and application errors** (`INVENTORY_*` ↔ `INVENTORY_*`,
  `IMPORT_*` ↔ `IMPORT_*`, etc.). The products module literally
  re-exports its domain error class from `@builders/application`.

**Implication:** the plan's `STAGED_INVENTORY_*` proposal diverges from
the codebase's established pattern by 0 → 11 existing codes. The
disambiguation reason ("staged what?") is real but the codebase has
already answered the question.

**Recommendation: use `STAGED_*` to match the domain prefix.** Application
codes that map cleanly to domain (e.g.,
`STAGED_BATCH_INELIGIBLE` ↔ `STAGED_ROW_BATCH_INELIGIBLE`) — keep them
distinct names. The `_INELIGIBLE` flavor without `_ROW_` reads as
"the batch as a whole is ineligible" vs the domain code's "row in batch
is ineligible." Subtle but consistent.

**Concrete proposed application code union (`STAGED_*`):**

```typescript
export type StagedInventoryErrorCode =
  | "STAGED_VALIDATION_FAILED"            // single-row form input
  | "STAGED_DIFF_VALIDATION_FAILED"       // diff-save validator failed
  | "STAGED_STALE_ROW_VERSION"            // per-row expectedUpdatedAt mismatch (diff-save)
  | "STAGED_BATCH_INELIGIBLE"             // batch readiness check failed
  | "STAGED_BATCH_RACE"                   // skippedRowIds non-empty after lock
  | "STAGED_MATERIALIZE_PRECONDITION_FAILED"  // worker found rows missing/wrong status
  | "STAGED_PARENT_NOT_FOUND"             // import row not found
```

Reads cleanly, matches domain convention. The `STAGED_INVENTORY_*`
prefix in the plan can be replaced 1:1 with `STAGED_*`. Class name stays
`StagedInventoryExecutionError` (descriptive, matches the module path).

If the parent-level `expectedUpdatedAt` decision comes back as (a),
add `STAGED_PARENT_STALE` (or include parent in `STAGED_STALE_ROW_VERSION`'s
payload — single code, payload distinguishes row-vs-parent). My pick:
single code, payload-disambiguated.

**Sub-decision the prompt should answer:** `STAGED_*` (matches domain)
or `STAGED_INVENTORY_*` (plan's choice, breaks pattern). **My pick:
`STAGED_*`.**

## Other facts the execution prompt should bake in

These aren't open questions — they're load-bearing details I'd want the
executing agent to know before writing code.

### A. The materialize use case needs a new data-layer read primitive

The plan's `materializeImportedStagedRowsUseCase` step 3 says: "Load
staged rows by ID, filtered to `importEntryId` and `status = QUEUED`."
The current data layer ships:

- `getStagedInventoryById(id, client)` — single row
- `listStagedInventoryByImport(importEntryId, client)` — all rows for an import

Neither accepts an ID list. The materialize use case can either:

- **Inline a Prisma `findMany`** with the ID list. Crosses the
  data-vs-application boundary that
  `packages/application/CLAUDE.md` rule 1 forbids.
- **Add a new primitive** like `listStagedInventoryByIds(importEntryId,
  ids, client)` to `read-repository.ts`. Cleaner.
- **Use `listStagedInventoryByImport` and filter in JS.** Wasteful for
  large imports.

**Recommendation: add a new read primitive.** ~10 lines. Either bundle
into sweep 4b's prompt (cohesive) or punt to a tiny data-layer touchup
sweep before 4b.

### B. The materialize use case needs `cost / startingStock` math; no domain helper exists

Plan step 5 says `costPerUnit = if cost && startingStock > 0: cost /
startingStock`. Searched domain:

- `categoryRequiresCoveragePerUnit` exists (used to gate coverage
  computation).
- `categorySupportsCoverageComputation` exists (alias).
- No `computeCostPerUnit` / `computeFreightPerUnit` helper exists in
  domain.

Two options:

- **Add `computeCostPerUnit({ cost, startingStock })`** and
  `computeFreightPerUnit` to domain. Pure math, fits the
  `computeInventoryBalance` / `computeInventoryCoverage` precedent in
  `packages/domain/src/flooring/inventory/computed.ts`.
- **Inline the math in the use case.** Violates the no-business-rules
  rule for application layer, but it's a 3-line `if/else / divide /
  round` so it's borderline.

**Recommendation: add the domain helpers.** ~20 lines in `computed.ts`.
The math has a documented contract (rounding, null handling, zero
guard) — that's a domain concern.

### C. `materializeStagedRowsToInventory` requires `sourceStagedRowId` per row, not stored on inventory

The data-layer primitive's input shape:

```typescript
inventoryRowsToCreate: Array<
  CreateInventoryRecordInput & { id: string; sourceStagedRowId: string }
>
```

`sourceStagedRowId` is used by the primitive to know which staged rows
to flip to IMPORTED — it is **not** stored on the inventory row. The
inventory row schema (line 266) has no `sourceStagedRowId` column.

The materialize use case must build per-row entries that include both
`id` (newly generated UUID) and `sourceStagedRowId` (the staged row's
existing UUID). The plan body sketch covers this implicitly; just want
to make sure the prompt is explicit so the executing agent doesn't
mistakenly try to write `sourceStagedRowId` to the inventory table.

### D. The `stagedInventoryRowSelect` already includes everything materialize needs

Confirmed at
`packages/db/src/flooring/imports/staged-inventory-rows/shared.ts:5-56`.
The select pulls:
- `product → name, style, color, coveragePerUnit`
- `product → category → slug, name, stockUnit{name, abbreviation}, itemCoverageUnit{name, abbreviation}, sendUnit{name, abbreviation}`
- `warehouse → name, number`
- `location → rafter, level, section, warehouse`

So the materialize use case's "load staged rows" step does **not** need
a separate product / category lookup — the existing select already
gives you everything. The new read primitive (§A) just needs to use
`stagedInventoryRowSelect`.

But: the existing `normalizeStagedInventoryRow` at
`read-repository.ts:36-74` flattens the join graph into the
`StagedInventoryRow` domain shape, which **drops** the unit
`abbreviation` fields and the per-product `coveragePerUnit`. The
domain row only carries `stockUnit: string` (just the name). For
materialize, we need:
- `stockUnitName`, `stockUnitAbbrev`
- `itemCoverageUnitName`, `itemCoverageUnitAbbrev`
- `sendUnitName`, `sendUnitAbbrev`
- `product.coveragePerUnit`

Two ways:
- **Materialize-specific read primitive** that returns the unflattened
  Prisma payload (or a richer domain shape). Don't go through the
  existing `StagedInventoryRecord` normalizer for this path.
- **Extend `StagedInventoryRow`** to carry all the snapshot fields.
  Touches domain shape — adds bytes per row to the normal read
  payload.

**Recommendation: dedicated materialize read primitive.** Returns the
raw `StagedInventoryRowPayload` (already typed) for the IDs requested,
filtered by `importEntryId` and `status: "QUEUED"`. The use case
flattens into `CreateInventoryRecordInput` itself. Read primitive name
suggestion: `listStagedInventoryForMaterialization(tx, { importEntryId,
ids })`.

### E. Pre-existing P2002 helper covers the outbox case cleanly

`isP2002(error, "idempotencyKey")` would catch the duplicate-insert
case. The data-layer touchup in §1 can use this directly:

```typescript
// inside createQueueOutboxEvent, after the .create call
} catch (error) {
  if (isP2002(error, "idempotencyKey")) {
    const existing = await client.queueOutboxEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: queueOutboxEventSelect,
    })
    if (existing) {
      return { event: toQueueOutboxEventRecord(existing), wasDuplicate: true }
    }
  }
  throw error
}
```

But — `isP2002` lives in `packages/application/src/shared/prisma-errors.ts`.
The data layer can't import from application (rule 1, both directions).
Either:
- Duplicate the predicate inline in the data-layer function (5 lines).
- Move `isP2002` to `packages/db/src/shared/prisma-errors.ts` and
  re-export from application. Cleaner long-term.

**Recommendation: move the helper to `packages/db/src/shared/`** and
re-export. Tiny refactor, keeps the helper available to both layers.

### F. The plan's `markStagedRowsForImportUseCase` body has an ordering subtlety

Plan steps 4 and 5:

> 4. Validate batch via domain `validateStagedImportBatch(rows)`
> 5. On any ineligible row, throw `STAGED_INVENTORY_BATCH_INELIGIBLE`
>    with per-row reasons in payload

`validateStagedImportBatch` already exists in domain
(`import-batch-rules.ts:25`). It returns
`StagedImportBatchValidationIssue[]` (each with `rowId` + `reason:
StagedImportabilityReason`). The use case can pass the issue array
verbatim into `payload.issues`.

Domain also exports `buildStagedImportBatchIneligibleMessage(issues)`
for the human-readable message. The use case should use it in the
`message` field, paralleling the
`describeInventoryDiffIssues(issues)` pattern from the deleted
`saveImportInventoryRowsUseCase`.

### G. `applyStagedInventoryRowsDiff` already handles per-row updates with heterogeneous patches

The data-layer primitive (signature at
`staged-inventory-rows/write-repository.ts:160`) already does:

- `deleteMany` for deleted rows
- `createMany` for added rows (with pre-assigned IDs)
- Per-row `update` for modified rows (heterogeneous patches)
- Re-reads via `listStagedInventoryByImport` as the post-state

So the diff-save use case's body is a **thin orchestration layer**:

1. Lock parent
2. Load existing
3. Resolve product / location lookups
4. Build `DiffStagedLocationLookup[]` and `knownProductIds`
5. Validate diff via `validateStagedInventoryRowsDiff(diff, resolution,
   parent)`
6. Per-row `expectedUpdatedAt` check (modify + delete entries)
7. Assign IDs via `assignStagedInventoryDiffIds(diff.added,
   crypto.randomUUID)`
8. Call `applyStagedInventoryRowsDiff(c, { importEntryId, added,
   modified, deleted })` — note: input shape doesn't accept the
   `StagedInventoryRowsDiff` type directly; it expects added entries
   with a pre-assigned `id` field. The use case must transform.
9. Return the result + tempIdMap

Step 8's input shape transformation is non-trivial. The data layer's
`ApplyStagedInventoryRowsDiffInput.modified[i].patch` is
`UpdateStagedInventoryRecordInput`, while the domain's
`StagedInventoryRowUpdate.patch` is `StagedInventoryRowUpdatePatch`.
The two are structurally similar but not identical. The use case has
to map.

### H. Sweep 5 unblock surface (apps/web)

Once sweep 4b lands, the apps/web fallout for the staged-row flow becomes
addressable:

- `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts:2` —
  imports the deleted `saveImportInventoryRowsUseCase`. Sweep 5 can
  rewire to `saveStagedInventoryRowsUseCase` (different path,
  different shape) once it exists.
- `apps/web/app/api/imports/_validators.ts:181` — references
  `validateInventoryRowsDiff` (deleted). Replace with
  `validateStagedInventoryRowsDiff`.

These don't block sweep 4b, but the executing agent should not be
surprised by them.

### I. Workers/relay still dead — sweep 4b's outbox events will accumulate

Once sweep 4b ships:
- Calling `markStagedRowsForImportUseCase` from a future route writes
  outbox rows with `topic: "flooring.imports.materialize"`.
- The relay's hard-coded single-topic dispatcher (audit §6.5) does NOT
  dispatch this topic — it claims them and exhausts them.
- `apps/relay/src/dispatch/work-order-allocation-outbox-dispatcher.ts:140-159`
  is the exhaust path. Outbox rows for `flooring.imports.materialize`
  go to `EXHAUSTED` with `lastError: "Unsupported outbox topic: flooring.imports.materialize"`.

**This means: shipping sweep 4b without sweep 4c (relay/worker
revival) AND without sweep 5 (routes) is safe** — no route calls the
producer, so no outbox rows get written. But the moment sweep 5 lands a
route that calls `markStagedRowsForImportUseCase`, the dispatcher will
exhaust every event.

**Sequencing constraint for the planning conversation:** sweep 4c
(relay/worker revival) must land **before** sweep 5 lands a route that
triggers the producer.

### J. Adopt or reject `expectedUpdatedAt` cleanly: the sub-decision affects the error code list

If question 5 lands as (a) — use-case owns parent staleness:
- Add `STAGED_STALE_ROW_VERSION` (covers both row-level and parent-level via payload)
- Sweep 5's route validates `expectedUpdatedAt: string` from the body and forwards to the use case

If question 5 lands as (b) — route owns parent staleness:
- No `STAGED_STALE_ROW_VERSION` for parent. The diff-save use case
  still has it for per-row checks.
- Sweep 5's route uses `withMutationTelemetry` (or successor) for the
  parent staleness check.

Either way the diff-save use case has per-row `expectedUpdatedAt`
internally — that's not optional, it's the established pattern from
the deleted file.

## Summary of decisions the execution prompt needs

| # | Question | My pick | Plan's pick | Severity |
|---|---|---|---|---|
| 4 | Idempotency key | (b) deterministic, with `wasDuplicate` return shape on `createQueueOutboxEvent` | (b) | **Material:** add a small data-layer task. |
| 5 | Parent `expectedUpdatedAt` | (b) route-layer (consistent with 17 existing patterns) | (a) use-case-layer (new pattern) | **Design:** either is correct; my pick is the convention-preserving one. |
| 6 | Error code prefix | `STAGED_*` (matches 11 existing domain codes) | `STAGED_INVENTORY_*` (verbose disambiguation) | **Pattern:** domain has already committed. |

Plus the additional facts the prompt should bake in:

- §A — new data-layer read primitive `listStagedInventoryForMaterialization` (~15 lines).
- §B — new domain helpers `computeCostPerUnit` / `computeFreightPerUnit` (~20 lines in `computed.ts`).
- §C — `sourceStagedRowId` is a caller-side correlator, not a column.
- §E — move `isP2002` to `packages/db/src/shared/` so the data layer can use it.
- §F — `validateStagedImportBatch` and `buildStagedImportBatchIneligibleMessage` already exist; use them directly.
- §G — `applyStagedInventoryRowsDiff` input shape transformation is non-trivial; the use case must map domain `patch` → data-layer `patch`.
- §I — sequencing constraint: sweep 4c must land before any sweep 5 route that calls `markStagedRowsForImportUseCase`.

## What the execution prompt looks like once these resolve

Three new files (plus the small data-layer touchups):

```
packages/db/src/queues/outbox-repository.ts                              (modify: add P2002 catch + wasDuplicate)
packages/db/src/shared/prisma-errors.ts                                  (new file: move isP2002 here, ~10 lines)
packages/application/src/shared/prisma-errors.ts                         (modify: re-export from @builders/db)
packages/db/src/flooring/imports/staged-inventory-rows/read-repository.ts (modify: add listStagedInventoryForMaterialization)
packages/domain/src/flooring/inventory/computed.ts                       (modify: add computeCostPerUnit, computeFreightPerUnit)
packages/application/src/flooring/imports/staged-inventory-rows/index.ts                    (new)
packages/application/src/flooring/imports/staged-inventory-rows/errors.ts                   (new)
packages/application/src/flooring/imports/staged-inventory-rows/types.ts                    (new)
packages/application/src/flooring/imports/staged-inventory-rows/save-staged-inventory-rows.ts        (new)
packages/application/src/flooring/imports/staged-inventory-rows/mark-staged-rows-for-import.ts       (new)
packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts         (new)
packages/application/src/flooring/imports/index.ts                       (modify: export the new submodule)
```

Touched: 6 modify, 6 new. Materially smaller than sweep 4a.

The plan can move to execution as soon as questions 4, 5, 6 are
resolved with explicit answers (or my recommendations are accepted).
