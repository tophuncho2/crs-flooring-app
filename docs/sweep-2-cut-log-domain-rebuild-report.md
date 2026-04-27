# Sweep 2 — Cut-Log Domain Rebuild Report

**Date:** 2026-04-26
**Plan:** `~/.claude/plans/take-a-look-at-functional-falcon.md`
**Audit:** [docs/sweep-2-cut-log-domain-audit.md](sweep-2-cut-log-domain-audit.md)
**Sweep doc:** `docs/sweeps/alteration/2_domain.md` (still empty placeholder; this report supersedes)
**Branch:** `staging`

## Headlines

- **Domain rewrite shipped.** Cut-log domain layer now mirrors the staged-inv pattern: lifecycle predicates, importability/finalizability blocker, per-row form validator, batch validators, diff-save scaffolding (`diff/types.ts` + `diff/rules.ts` + `diff/identity.ts`), three queue payload schemas in `packages/domain/src/queue/`.
- **`finalize-payload.ts` deleted** — its content was relocated and split into three queue payloads (`finalize-cut-log-batch.ts`, `pending-save-cut-log-batch.ts`, `void-cut-log.ts`) under the canonical `packages/domain/src/queue/` location.
- **Layering fix landed** — `cut-logs/types.ts` no longer imports from `@prisma/client`. The cut-log half of the pre-existing `guard:prisma` failure is now resolved. The staged-inv sibling violation persists (out of scope).
- **Pure helpers landed** — `cut-sum-math.ts` (totalCutSum invariant) and `final-cut-sequence.ts` (per-inventory finalize ordinal allocator). Both will be consumed by the data + worker layers in sweep 3 / 6.
- **Two functions retired** — `assertCutLogUserTransition` / `isCutLogUserTransitionAllowed` / `CutLogUserTransition` (users no longer write `status`) and `isCutLogMostRecent` (pending cut logs deletable in any order). Verified zero callers remain via ripgrep.
- **Sweep 2 typecheck regressions: 0.** All workspaces that compile clean today still compile clean. The web typecheck failures (work-orders module) are pre-existing on staging and unchanged.

## Typecheck error counts

| Workspace | Errors | Notes |
|---|---|---|
| @builders/domain | 0 | clean (this is the workspace sweep 2 actually changes) |
| @builders/db | 0 | clean |
| @builders/application | 0 | clean |
| @builders/lib | 0 | clean |
| @builders/relay | 0 | clean |
| @builders/worker | 0 | clean |
| @builders/web | 0 attributable | 18 pre-existing errors in `apps/web/modules/work-orders/record/panel/{shared.ts, work-order-record-panel.tsx}` — work-orders module mid-rewrite on staging branch, unchanged by sweep 2 |

## guard:prisma

| Before sweep 2 | After sweep 2 |
|---|---|
| Failed on cut-logs/types.ts AND staged-inventory-rows/types.ts | Failed only on staged-inventory-rows/types.ts (out-of-scope sibling) |

The cut-log half is fixed by replacing the `@prisma/client` import with a pure domain string-literal union (`type FlooringCutLogStatus = "PENDING" | "QUEUED" | "FINAL" | "VOID"`). Structurally identical to Prisma's generated type, so cross-layer assignment works without a converter.

The staged-inv sibling violation remains and will need the same treatment in a future cleanup (not sweep 2, not sweep 3).

## Files changed

### Modified

- `packages/domain/src/flooring/inventory/cut-logs/types.ts` — REWRITTEN. Replaced Prisma import with pure string-literal union. Added `isFinal`, `cutLogNumber`, `finalCutSequence` to `CutLogRow`. Added `CutLogPendingForm`, `EMPTY_CUT_LOG_PENDING_FORM`, `toCutLogPendingForm`, `CutLogLinkUpdate`.
- `packages/domain/src/flooring/inventory/cut-logs/editability.ts` — REWRITTEN. New 4-value-lifecycle header. Updated field partitions: `CUT_LOG_PENDING_USER_EDITABLE_FIELDS = ["cut", "cost", "freight", "isWaste", "notes"]`, new `CUT_LOG_LINK_FIELDS`, expanded `CUT_LOG_WORKER_FIELDS` with `isFinal` + `finalCutSequence` + `void`. Added 7 lifecycle predicates (`isCutLogPendingEditable`, `isCutLogQueued`, `isCutLogFinalized`, `isCutLogVoided`, `canDeleteCutLog`, `canVoidCutLog`, `canEditCutLogLinks`). Added `CutLogFinalizabilityReason` + `getCutLogFinalizabilityBlocker` + `canFinalizeCutLog` + `buildCutLogNotPendingMessage`. Added `isCutLogLinkField` + `isCutLogAutoField` type guards.
- `packages/domain/src/flooring/inventory/cut-logs/errors.ts` — EXTENDED. 6 new codes: `CUT_LOG_BATCH_INELIGIBLE`, `CUT_LOG_PENDING_SAVE_VALIDATION_FAILED`, `CUT_LOG_VOID_NOT_ALLOWED`, `CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK`, `CUT_LOG_FINAL_SEQUENCE_INVALID`, `CUT_LOG_LINK_UPDATE_BLOCKED`. Class signature unchanged.
- `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts` — TRIMMED + UPDATED. Dropped `assertCutLogUserTransition`, `isCutLogUserTransitionAllowed`, `CutLogUserTransition`, `isCutLogMostRecent`. Updated `formatCutLogStatus` to handle QUEUED. Updated `assertCutLogDeleteAllowed` to wrap `canDeleteCutLog`. Updated `assertCutLogReadyToFinalize` to use `getCutLogFinalizabilityBlocker` + still gate on `isDirty`. Updated `buildVoidedCutLogPatch` to preserve `before`/`after`/`isWaste`/`notes`/links and only erase `cut/coverageCut/cost/freight`. Updated `assertCutLogPendingSaveInputAllowed` to use `isCutLogPendingEditable`. Kept `assertBeforeCutAfterInvariant`, `assertCutLogLinkageSymmetry`, `assertCutLogVoidStatusConsistency`.
- `packages/domain/src/flooring/inventory/cut-logs/index.ts` — extended barrel to export every new file.
- `packages/domain/src/index.ts` — added 3 new queue payload exports.
- `docs/sweep-2-cut-log-domain-audit.md` — moved Open Questions → Resolved section per user instruction.

### New (cut-logs/)

- `packages/domain/src/flooring/inventory/cut-logs/cut-sum-math.ts` — `computeTotalCutSum`, `assertCutSumWithinStartingStock`, `isCutSumWithinStartingStock`.
- `packages/domain/src/flooring/inventory/cut-logs/final-cut-sequence.ts` — `nextFinalCutSequence(currentMax)`.
- `packages/domain/src/flooring/inventory/cut-logs/form-rules.ts` — `validateCutLogPendingForm`, `CutLogPendingFormIssue` union, `describe*` helpers.
- `packages/domain/src/flooring/inventory/cut-logs/finalize-batch-rules.ts` — `validateCutLogFinalizeBatch`, `CutLogFinalizeBatchIssue`, `buildCutLogFinalizeBatchIneligibleMessage`.
- `packages/domain/src/flooring/inventory/cut-logs/void-rules.ts` — `getCutLogVoidBlocker`, `isCutLogVoidable`, `validateCutLogVoidRequest`, `buildCutLogVoidNotAllowedMessage`, `CutLogVoidBlockerReason`, `CutLogVoidValidationIssue`.
- `packages/domain/src/flooring/inventory/cut-logs/link-rules.ts` — `validateCutLogLinkUpdate`, `CutLogLinkValidationIssue` union, `describe*` helpers.
- `packages/domain/src/flooring/inventory/cut-logs/diff/types.ts` — `CutLogDraft`, `CutLogPatch`, `CutLogUpdate`, `CutLogDelete`, `CutLogsDiff`, `CutLogParentContext`, `DiffExistingCutLogRow`, `CutLogDiffResolution`, `CutLogDiffValidationIssue`, `describe*` helpers.
- `packages/domain/src/flooring/inventory/cut-logs/diff/rules.ts` — `validateCutLogsDiff(diff, resolution, parent)`. 4-stage validation (form, editability, optimistic-lock, totalCutSum invariant).
- `packages/domain/src/flooring/inventory/cut-logs/diff/identity.ts` — `assignCutLogDiffIds`, `buildCutLogTempIdMap`. Pure — UUID generator injected.

### New (queue/)

- `packages/domain/src/queue/finalize-cut-log-batch.ts` — `FINALIZE_CUT_LOG_TOPIC` (same name preserved), `FINALIZE_CUT_LOG_QUEUE`, `FINALIZE_CUT_LOG_JOB_NAME`, Zod schema, parser. Batch (max 500 cut logs).
- `packages/domain/src/queue/pending-save-cut-log-batch.ts` — `PENDING_SAVE_CUT_LOG_*` constants, Zod schema (with embedded diff: added/modified/deleted, max 500 each), parser.
- `packages/domain/src/queue/void-cut-log.ts` — `VOID_CUT_LOG_*` constants, single-row payload (no array), parser.

### Deleted

- `packages/domain/src/flooring/inventory/cut-logs/finalize-payload.ts` — content relocated to `queue/finalize-cut-log-batch.ts` + expanded into three queue payloads. Old single-row schema is obsolete (replaced by 500-row batch).

## Decisions baked in

All 14 resolved decisions from the approved plan landed as written. Notable callouts:

1. **`buildVoidedCutLogPatch`** preserves `before`/`after` (audit history of the cut state at the moment of finalize), `isWaste`, `notes`, links, `isFinal`, `finalCutSequence`, `cutLogNumber`. Erases only `cut → "0"` (NOT NULL constraint forces "0" sentinel), `coverageCut → null`, `cost → null`, `freight → null`. Sets `void = true`, `status = "VOID"`. This is a tighter erase set than the old patch (which also nulled links + isWaste + before/after), reflecting the user's clarification that links are editable for life and isWaste/notes are historical.
2. **`coverageCut` is part of the void erase set** per intent doc ("cut, coverageCut, cost, freight, etc."). User's brief listing of "cut, cost, freight" wasn't taken as exhaustive — coverageCut is derived from cut and would be stale otherwise.
3. **`CUT_LOG_PENDING_USER_EDITABLE_FIELDS`** = 5 fields (`cut, cost, freight, isWaste, notes`). `coverageCut` stays as a transactional/worker-recomputed field, NOT user-editable. (Comment thread did not unambiguously settle this — going with the existing convention from before sweep 2.)
4. **Link fields excluded from pending-save diff.** Per the intent doc + plan, link edits flow through their own sync use case (sweep-4 work). The pending-save worker contract (`pending-save-cut-log-batch.ts`) does NOT carry link fields.
5. **`FlooringCutLogStatus` defined as a pure string-literal union** in `types.ts`. Not imported from `@prisma/client` (would violate domain CLAUDE.md rule 1) and not re-routed through `@builders/db` (same rule). Structurally identical to Prisma's generated enum.

## Verification commands run

| Command | Result |
|---|---|
| `npm run typecheck --workspace @builders/domain` | clean |
| `npm run typecheck --workspace @builders/db` | clean |
| `npm run typecheck --workspace @builders/application` | clean |
| `npm run typecheck --workspace @builders/lib` | clean |
| `npm run typecheck --workspace @builders/relay` | clean |
| `npm run typecheck --workspace @builders/worker` | clean |
| `npm run typecheck --workspace @builders/web` | 18 pre-existing failures (work-orders module), 0 sweep-2 regressions |
| `npm run guard:prisma` | cut-log half fixed; staged-inv sibling persists (out of scope) |
| `rg "FlooringCutLogStatus" packages apps` | refs only in domain (definition + uses), packages/db (Prisma + migrations), and verification script |
| `rg "FINALIZE_CUT_LOG_TOPIC|finalize-payload"` | only in `queue/finalize-cut-log-batch.ts`; `finalize-payload.ts` fully retired |
| `rg "assertCutLogUserTransition\|isCutLogMostRecent"` | zero references — dropped functions cleanly retired |

## Out of scope (next sweeps)

- **Sweep 3 (data layer):** repository primitives — pending-save (locked diff apply + totalCutSum maintenance), finalize-apply (worker writes `before`/`after`/`finalCutSequence`/`status`/`isFinal` and consumes `nextFinalCutSequence`), void-apply (consumes `buildVoidedCutLogPatch`), batch fetchers, the `MAX(finalCutSequence)` lookup the worker uses. The pure helpers from this sweep (`cut-sum-math.ts`, `final-cut-sequence.ts`, `cut-log-rules.ts` patches) become the data layer's single source of truth.
- **Sweep 4 (application):** three producer use cases (one per worker job) + three consumer use cases (worker-side wrappers around data + domain) + the separate sync link-edit use case.
- **Sweep 5 (relay + worker + outbox topic registration):** three relay dispatchers (one per topic), three worker handlers (one per topic). Topic / queue / job-name constants are already shipped in `packages/domain/src/queue/`. **(Order corrected — relay/worker has to land before routes so producers don't write outbox events with no dispatcher.)**
- **Sweep 6 (API routes):** `POST /api/inventory/[id]/cut-logs/...` for queue-pending-save, queue-finalize, queue-void; separate sync route for link edits.
- **Sweep 7 (loaders):** inventory record-view loaders surfacing pending vs finalized splits + queued indicator + `finalCutSequence` ordering.
- **Sweep 8 (UI + controllers):** cut-logs section migration, selection state + finalize action, per-row void action, separate work-order-link controller.
- **Out-of-sweep cleanup:** `staged-inventory-rows/types.ts` Prisma import (apply the same string-literal-union fix). Adding the work-order-link DB CHECK constraint (deferred indefinitely).

## Sweep checklist update

`docs/sweeps/alteration/2_domain.md` is still an empty placeholder. This
report supersedes; the placeholder file can either be removed in a
follow-up commit or filled with a one-line "see
sweep-2-cut-log-domain-rebuild-report.md" pointer.
