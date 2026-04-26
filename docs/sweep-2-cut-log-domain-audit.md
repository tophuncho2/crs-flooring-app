# Sweep 2 — Cut-Log Domain Audit (Pre-Implementation)

**Date:** 2026-04-26
**Scope:** Inventory the current `packages/domain/src/flooring/inventory/cut-logs/`
surface, compare against the canonical staged-inventory-rows / imports
domain pattern, and flag every stale planning artifact that needs to be
rewritten or removed before sweep 2 (the cut-log domain rebuild) starts.
**Companion docs:** [cut-logs-finalize-and-void-intent.md](cut-logs-finalize-and-void-intent.md),
[sweep-1-cut-log-schema-alteration-report.md](sweep-1-cut-log-schema-alteration-report.md),
[sweeps/alteration/2_domain.md](sweeps/alteration/2_domain.md) (empty placeholder).

## TL;DR

- Cut-log domain has 7 files (`types`, `editability`, `errors`,
  `cut-log-rules`, `finalize-payload`, `category-math`, `index`).
- **2 survive untouched** (`errors.ts`, `category-math.ts`); **2 need
  extension** (`types.ts`, `editability.ts`); **1 needs heavy rewrite**
  (`cut-log-rules.ts`); **1 should be moved + expanded into 3**
  (`finalize-payload.ts`).
- **Zero worker / outbox scaffolding outside the domain layer** — no stale
  handler, processor, dispatcher, application use case, or topic
  registration to remove. The "previous plan" the user remembers boils
  down to `finalize-payload.ts` only; everything else is greenfield.
- Cut logs are **missing 5 file-shaped concepts** that staged-inv has:
  per-row form validator, batch-readiness validator, diff-save scaffolding
  (3 files), and the queue-payload location convention
  (`packages/domain/src/queue/` instead of inside the entity folder).
- One layering violation persists: `types.ts` imports
  `FlooringCutLogStatus` directly from `@prisma/client`; sweep 2 must
  re-route through `@builders/db`.

## Reference: staged-inventory / imports domain (the template)

### `packages/domain/src/flooring/imports/`

Top-level "imports" entity files:

| File | Role |
| --- | --- |
| `index.ts` | Barrel re-export of all sibling files + the `staged-inventory-rows/` sub-barrel. |
| `errors.ts` | `ImportDomainError` class + `ImportDomainErrorCode` string union. Constructor: `(code, message)`. |
| `editability.ts` | Field-partition constants (`USER_EDITABLE`, `WORKER_FIELDS`, `AUTO_FIELDS`) + `is*Field` type guards. |
| `types.ts` | Read shape (`ImportRow`), form shape (`ImportPrimaryForm`), enum shapes (`ImportFormOptions`), `EMPTY_*` constants, `to*Form()` helper. |
| `form-rules.ts` | Per-record form validator returning `Issue[]`. Named `validateImportPrimaryForm`. Companion `describe*Issue()` for human text. |
| `delete-rules.ts` | Predicate `isImportDeleteBlocked(state)` + message builder `buildImportDeleteBlockedMessage(state)`. |
| `warehouse-rules.ts` | Same shape as `delete-rules.ts` for parent-change blocking. |
| `filters.ts` | List-page filter parsers (dedup, trim, validate). |

### `packages/domain/src/flooring/imports/staged-inventory-rows/`

The per-row sub-domain that cut logs should mirror most closely:

| File | Role |
| --- | --- |
| `index.ts` | Barrel. |
| `types.ts` | `StagedInventoryRow` (full read shape — includes both `status` enum AND `isImported` latch), `StagedInventoryForm`, enum re-exports. |
| `editability.ts` | **Lifecycle predicates** (`isStagedRowEditable`, `isStagedRowQueued`, `isStagedRowMaterialized`, `canDeleteStagedRow`); **importability validator** (`getStagedRowImportabilityBlocker` returning a `StagedImportabilityReason` or null, plus `canImportStagedRow`); **message builder** (`buildStagedRowNotDraftMessage`); **field partition** constants. All in one file. |
| `errors.ts` | `StagedInventoryDomainError` + `StagedInventoryDomainErrorCode` union (11 codes covering validation, lock, mismatch, ineligibility). |
| `form-rules.ts` | Per-row form validator. `validateStagedInventoryForm(input, location?)` → `StagedInventoryValidationIssue[]`. `describe*Issue()` + `describe*Issues()` companions. |
| `import-batch-rules.ts` | **Batch-readiness validator**. `validateStagedImportBatch(rows)` walks each row through `getStagedRowImportabilityBlocker()` and returns `[{rowId, reason}]`. `buildStagedImportBatchIneligibleMessage(issues)` companion. This is the gate the producer use case calls before flipping rows to `QUEUED`. |
| `diff/types.ts` | Diff-save shapes: `*Draft` (with `tempId`), `*Patch` (optional fields only), `*Update` (id + `expectedUpdatedAt` + patch), `*Delete`, `*Diff` (`{added, modified, deleted}`), `*ParentContext`, issue-union, describe helpers. |
| `diff/rules.ts` | `validateStagedInventoryRowsDiff(diff, resolution, parent)` — multi-row batch validator. Calls predicates from `editability.ts`. |
| `diff/identity.ts` | `assignStagedInventoryDiffIds(entries, generateId)` + `buildStagedInventoryTempIdMap(entries)`. **Pure** — application injects the UUID generator. |

### `packages/domain/src/queue/`

Outbox-event / worker-queue payload schemas live OUTSIDE the entity
folders, in a flat `queue/` directory:

- `materialize-import-batch.ts` — exports `IMPORT_MATERIALIZE_TOPIC`,
  `IMPORT_MATERIALIZE_QUEUE`, `IMPORT_MATERIALIZE_JOB_NAME`,
  `ImportMaterializeBatchPayloadSchema` (Zod), `ImportMaterializeBatchPayload`
  type, `parseImportMaterializeBatchPayload(value)` parser.

**Payload schema convention:**

```ts
export const X_TOPIC = "flooring.subdomain.action" as const
export const X_QUEUE = "flooring-subdomain-action" as const
export const X_JOB_NAME = "action-batch" as const

export const XPayloadSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(X_TOPIC),
  // entity ids (denormalized parent for FOR UPDATE locks)
  // batch row ids (min 1, max 500)
  requestedBy: z.object({ userId: z.string().uuid(), userEmail: z.string().email() }),
  requestedAt: z.string().datetime(),
})

export type XPayload = z.infer<typeof XPayloadSchema>
export function parseXPayload(value: unknown): XPayload { return XPayloadSchema.parse(value) }
```

### Conventions distilled

1. **Errors** — one class per sub-domain, code as string union, constructor `(code, message)`.
2. **Predicates** — return `boolean`, named `is*` / `can*` / `should*`.
3. **Validators** — return `Issue[]` (empty = pass), named `validate*`. Issues are discriminated unions with `code` + context.
4. **Message builders** — colocated with the rule that produces the issue. Named `build*Message(input)` or `describe*Issue(issue)`.
5. **Field splits** — `const` readonly tuples named `*_USER_EDITABLE_FIELDS`, `*_WORKER_FIELDS`, `*_AUTO_FIELDS` + `is*Field()` type guards.
6. **Zod payloads** — schema + inferred type + parser function in `packages/domain/src/queue/<topic>.ts`. Topics use `domain.subdomain.action`. Max batch 500 rows. `version: "v1"` literal first.
7. **Diff-save** — three-file split (`diff/types.ts`, `diff/rules.ts`, `diff/identity.ts`). Diff-rules call lifecycle predicates from `editability.ts` for lock checks. Identity helpers are pure with injected UUID generator.

## Current cut-log domain inventory

### `packages/domain/src/flooring/inventory/cut-logs/`

| File | Verdict | Notes |
| --- | --- | --- |
| `index.ts` | KEEP, extend exports | Barrel — must surface any new files added in sweep 2. |
| `types.ts` | **EXTEND + FIX** | (a) `CutLogRow` missing the 3 new sweep-1 fields (`isFinal`, `cutLogNumber`, `finalCutSequence`). (b) Direct `@prisma/client` import — **guard:prisma violation**, must re-route through `@builders/db`. (c) No `CutLogForm` shape, no `EMPTY_CUT_LOG_FORM`, no `toCutLogForm(record)` helper — staged-inv has these. |
| `editability.ts` | **EXTEND + REWRITE COMMENT** | Stale leading comment claims "lifecycle is PENDING → FINAL → VOID" — wrong since sweep 1 added `QUEUED`. Field partition is missing `isFinal` (worker-set), `cutLogNumber` (auto/sequence-backed), `finalCutSequence` (worker-set). No lifecycle predicates (`isCutLogPendingEditable`, `isCutLogQueued`, `isCutLogFinalized`, `isCutLogVoided`) — those are the staged-inv `editability.ts` shape. |
| `errors.ts` | **KEEP, extend codes** | The class is fine. Codes are reusable. Sweep 2 will add a few new codes for batch-finalize, batch-pending-save, void-already-final, etc. |
| `cut-log-rules.ts` | **HEAVILY REWRITE** | (a) `formatCutLogStatus()` is missing the `QUEUED` case. (b) `assertCutLogUserTransition` hardcodes the 3-value transition graph (`PENDING→FINAL`, `PENDING→VOID`, `FINAL→VOID`); needs to decide whether `QUEUED` is user-visible at all (intent doc says it's worker-internal — so users should NEVER write status; the transition validator may not be needed at all post-sweep-2). (c) `assertCutLogReadyToFinalize` checks `status !== "PENDING"` but should also check `isFinal === false` for watertight invariant. (d) Several rules predate the worker-driven model (e.g. `assertCutLogDeleteAllowed`, `isCutLogMostRecent`) and need to be re-evaluated against "PENDING rows can be freely add/edit/delete; non-PENDING rows are immutable except for the work-order-link separate flow". |
| `finalize-payload.ts` | **MOVE + EXPAND TO 3** | Currently lives inside the entity folder; staged-inv convention places payloads in `packages/domain/src/queue/`. Schema is missing `version: "v1"` literal, has no `QUEUE` or `JOB_NAME` constants, and is single-row (no `cutLogIds: z.array(...).min(1).max(500)` for batches). Per intent doc, three worker jobs are needed: `pending-save`, `finalize`, `void`. **One file becomes three.** |
| `category-math.ts` | **KEEP** | Pure `computeCutCoverage()` math wrapping `convertStockToCoverage`. No schema/enum dependencies. Reusable as-is. |

### Cut-log references outside the domain layer

- `apps/worker/` — **none.** No cut-log handler / processor file exists.
- `apps/relay/` — **none.** No cut-log dispatcher.
- `packages/application/` — only `delete-inventory.ts` does a count-based check on `state.cutLogsCount` (parent inventory deletion guard). No finalize/void/save use cases exist.
- `packages/db/src/queues/` — no cut-log topics registered.
- `packages/domain/src/queue/` — only `materialize-import-batch.ts` (the staged-inv payload). No cut-log files.

**Conclusion:** the user's recollection of "previous plan worker logic" is real but limited — it's the standalone `finalize-payload.ts` inside the entity folder. There is **no live wiring** to dismantle. Sweep 2 is essentially greenfield for the worker contract; it just needs to relocate + expand `finalize-payload.ts` and rewrite the rule files against the new schema.

## Gap analysis — what cut logs are MISSING vs the staged-inv pattern

| Concept | Staged-inv has | Cut-log has |
| --- | --- | --- |
| Per-row form validator | `staged-inventory-rows/form-rules.ts` | **MISSING** |
| Batch-readiness validator | `staged-inventory-rows/import-batch-rules.ts` | **MISSING** |
| Lifecycle predicates | `editability.ts` (`isStagedRowEditable`, `isStagedRowQueued`, `isStagedRowMaterialized`, `canDeleteStagedRow`) | **MISSING** (only field partitions) |
| Importability blocker enum + reason builder | `editability.ts` (`StagedImportabilityReason` + `getStagedRowImportabilityBlocker` + `buildStagedRowNotDraftMessage`) | **MISSING** |
| Diff-save scaffolding | `diff/types.ts`, `diff/rules.ts`, `diff/identity.ts` | **MISSING** (assumes diff-save lands as the pending-save mode — still TBD per intent doc) |
| Form shape + EMPTY constant + `toForm()` helper | `types.ts` (`ImportPrimaryForm`, `EMPTY_IMPORT_PRIMARY_FORM`, `toImportPrimaryForm`) | **MISSING** |
| Queue payload(s) in `packages/domain/src/queue/` | `materialize-import-batch.ts` (1 payload, the only worker job for staged-inv) | **MISPLACED** (`finalize-payload.ts` lives inside entity folder) and **INCOMPLETE** (single-row, no version, no QUEUE/JOB_NAME constants, only 1 of 3 needed) |
| Errors-class + code union | `errors.ts` (11 codes) | **HAVE** (9 codes — extend with batch-level codes during sweep 2) |
| Field partition + type guards | `editability.ts` | **HAVE** (5 partitions; needs new fields added) |
| Coverage / category math | N/A (different concern) | **HAVE** (`category-math.ts` — survives) |
| Parent-change / delete blocking predicate | `delete-rules.ts`, `warehouse-rules.ts` | **N/A** — cut logs don't have parent-change semantics (parent inventory is fixed at create); delete blocking lives in `cut-log-rules.ts` (`assertCutLogDeleteAllowed`). |

## Stale planning artifacts to scrap or rewrite

1. **`finalize-payload.ts`** — relocate to `packages/domain/src/queue/finalize-cut-log-batch.ts` and rewrite to match `materialize-import-batch.ts` shape (batch of `cutLogIds`, `version: "v1"`, `topic` literal, separate `QUEUE` + `JOB_NAME` constants, denormalized `inventoryId` for the parent FOR UPDATE lock). Add two siblings: `pending-save-cut-log-batch.ts`, `void-cut-log.ts` (single-row per the intent doc — voids are always one at a time).
2. **`cut-log-rules.ts` formatCutLogStatus** — must add the `QUEUED` case (probably "Queued" or "Processing").
3. **`cut-log-rules.ts` assertCutLogUserTransition** — likely delete entirely. Per intent doc, users never write `status` directly post-sweep-1 (worker owns it). The transition validator was a pre-worker-model artifact.
4. **`cut-log-rules.ts` assertCutLogReadyToFinalize** — tighten check from `status !== "PENDING"` to `(status !== "PENDING" || isFinal === true || void === true)`. Belt-and-suspenders against re-finalizing a finalized row.
5. **`cut-log-rules.ts` isCutLogMostRecent + assertCutLogDeleteAllowed** — re-evaluate against new rule "PENDING + non-final rows can be freely add/edit/delete". The most-recent constraint may not survive worker-driven finalize; or it may move into a batch-level invariant.
6. **`cut-log-rules.ts` buildVoidedCutLogPatch** — keep, but verify the new fields (`isFinal`, `finalCutSequence`) are NOT erased (only `cut`, `coverageCut`, `cost`, `freight` are erased per intent doc; `isFinal` and `finalCutSequence` should stay as historical record per the immutable-row philosophy).
7. **`editability.ts` lifecycle comment** — replace with the 4-value lifecycle.
8. **`types.ts` Prisma import** — re-route `FlooringCutLogStatus` import through `@builders/db` to satisfy `guard:prisma`. Mirror whatever the staged-inv `types.ts` does (note: staged-inv `types.ts` has the SAME violation per the sweep-1 report — both should be fixed, but only the cut-log one is in sweep-2 scope).

## Files that survive untouched

- `category-math.ts` — pure math.
- `errors.ts` — class + code union (extension only, no rewrite).

## Layering violation

`packages/domain/src/flooring/inventory/cut-logs/types.ts` lines 1 + 4
import / re-export `FlooringCutLogStatus` directly from `@prisma/client`,
violating `packages/CLAUDE.md` rule 1 (no `apps/` imports — but more
importantly, violating `packages/db/CLAUDE.md` which makes `@builders/db`
the sole owner of Prisma types). The `npm run guard:prisma` script
enforces this and currently fails because of this file (and a
sibling violation in `staged-inventory-rows/types.ts` outside scope).

**Sweep-2 fix:** ensure `@builders/db` exports `FlooringCutLogStatus`
through one of its public entry points (likely already does — verify in
`packages/db/src/index.ts`), then change the cut-log `types.ts` import
to `from "@builders/db"`.

## Proposed sweep-2 file layout

```
packages/domain/src/flooring/inventory/cut-logs/
├── index.ts                 # barrel — extended
├── types.ts                 # +isFinal, +cutLogNumber, +finalCutSequence; +CutLogForm; fix Prisma import
├── editability.ts           # add lifecycle predicates + importability/finalizability blocker; update field partition; rewrite header comment
├── errors.ts                # +batch codes; otherwise unchanged
├── form-rules.ts            # NEW — per-row form validator (validateCutLogForm, describeIssue)
├── finalize-batch-rules.ts  # NEW — validateCutLogFinalizeBatch (mirrors import-batch-rules.ts)
├── pending-save-batch-rules.ts  # NEW — if pending-save is diff/batch mode (TBD per intent doc)
├── void-rules.ts            # NEW — single-row void readiness (always one at a time)
├── cut-log-rules.ts         # rewritten: formatStatus +QUEUED, drop user-transition validator, tighten finalize gate, keep void-patch builder + arithmetic/linkage rules
├── category-math.ts         # untouched
└── diff/                    # OPTIONAL — only if pending-save is diff-mode (sweep-2 OQ)
    ├── types.ts
    ├── rules.ts
    └── identity.ts

packages/domain/src/queue/
├── materialize-import-batch.ts          # untouched
├── finalize-cut-log-batch.ts            # NEW — relocates+expands current finalize-payload.ts
├── pending-save-cut-log-batch.ts        # NEW
└── void-cut-log.ts                      # NEW — single-row, no batch
```

Plus the sweep-2 work updates `packages/domain/src/flooring/inventory/cut-logs/finalize-payload.ts` → DELETED (content moved to queue/ folder).

## Open questions for sweep 2

- **Pending-save mode** — diff-save (one batch job per flushed diff) vs single-edit-save (one job per edit)? Affects whether `diff/` folder is needed and what the pending-save payload shape looks like. Carried forward from intent doc.
- i think the save for pending rows should still use diffs and temp id's because it needs to handle new rows added, edits, deletes. unless for some reason diffs are unecessary and theres a better method then call it out.
- then finalizing rows uses the select multiple rows only on clean slate and then clean finalize rows to enquue that worker. and the worker that handles pending rows is triggered from the cananicol save button.

- **`finalCutSequence` allocator location** — is it a domain-pure pure function (e.g. `nextFinalCutSequence(currentMax: number | null): number`) called by the worker after the worker's locked `MAX(...)` query? Or is allocation pure-DB? Sweep 1 plan suggested a pure helper in domain — confirm.
- there definetly needs to be a function so that workers can number final cuts in order that they happen for a single inventories item. 
- There also definetly needs to be functions that is used in each use case for how the inventory cut sum is re-calculated. 

- **User-visible `QUEUED` UI label** — what should `formatCutLogStatus("QUEUED")` return? "Queued"? "Processing"? "Worker active"? Affects the UI in sweep 8 but the label lives in domain.
- is this refering to the actual enum or just a status that shows in the ui not a real column? explain

- **`assertCutLogUserTransition` retention** — kept or deleted? Recommended: delete, since users no longer touch `status` post-sweep-1.
- delete if its not a part of what were doing now. this is the full sweep for cut logs domain

- **`isCutLogMostRecent` + `assertCutLogDeleteAllowed` retention** — under "PENDING is freely editable + worker-only completes", does the most-recent constraint still apply? Probably not — pending rows can be deleted in any order; finalized rows can't be deleted at all.
- yes, pending cut logs can be deleted in any order.
- finalized rows can only be voided.

- **Work-order-link CHECK constraint** — deferred from sweep 1 to here. Domain rule (`assertCutLogLinkageSymmetry`) already exists in `cut-log-rules.ts` — keep relying on it, OR add the DB CHECK in a small follow-up migration. User's call.
- what is this for.

Also i just want to confirm that we are scoped to the cut logs domain. the data layer is the next sweep. application use cases are after data layer. 

