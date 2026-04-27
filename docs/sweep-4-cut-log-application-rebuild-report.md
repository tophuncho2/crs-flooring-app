# Sweep 4 — Cut-Log Application Layer (Use Cases) Report

**Date:** 2026-04-26
**Plan:** `~/.claude/plans/take-a-look-at-functional-falcon.md`
**Audit / refs:** [docs/sweep-2-cut-log-domain-rebuild-report.md](sweep-2-cut-log-domain-rebuild-report.md), [docs/sweep-3-cut-log-data-rebuild-report.md](sweep-3-cut-log-data-rebuild-report.md), [docs/sweep-3-cut-log-data-audit.md](sweep-3-cut-log-data-audit.md)
**Sweep doc:** `docs/sweeps/alteration/4_application.md` (still empty placeholder; this report supersedes)
**Branch:** `staging`

## Headlines

- **7 use cases shipped** in the new `packages/application/src/flooring/inventory/cut-logs/` folder. Three producer + three consumer pairs for the worker flows, plus one sync use case for the link-management flow.
- **`updateCutLogLinks` data primitive added** to `packages/db/src/flooring/inventory/cut-logs/write-repository.ts` (cross-sweep extension — same pattern as sweep-3 adding `finalize-math.ts` to the domain).
- **Sweep-2 payload schema bug fixed:** `pending-save-cut-log-batch.ts`'s `CutLogDraftPayload` was missing `id` (only had `tempId`). Added `id: z.string().uuid()` so the producer can pre-stamp UUIDs and the worker's `createMany` is idempotent across retries.
- **Parent inventory barrel updated** to re-export `cut-logs/`.
- **Sweep-4 typecheck regressions: 0.** All workspaces clean except the 3 pre-existing `apps/web/modules/work-orders/...` errors (unchanged, out of scope).
- **Convention checks all green:** every use case wraps in `withDatabaseTransaction` (rule 3); imports come only from `@builders/domain` / `@builders/db` / relative / `node:`; no `Request` / `Response` / `NextResponse` / `fetch` references (rule 2); `createQueueOutboxEvent` appears in exactly 3 producer files.

## Use case inventory

| # | Use case | File | Kind | Calls outbox? |
|---|---|---|---|---|
| 1 | `saveCutLogPendingDiffUseCase` | `save-cut-log-pending-diff.ts` | Producer | ✅ |
| 2 | `applyCutLogPendingDiffUseCase` | `apply-cut-log-pending-diff.ts` | Consumer (worker) | — |
| 3 | `markCutLogsForFinalizeUseCase` | `mark-cut-logs-for-finalize.ts` | Producer | ✅ |
| 4 | `finalizeCutLogsUseCase` | `finalize-cut-logs.ts` | Consumer (worker) | — |
| 5 | `markCutLogForVoidUseCase` | `mark-cut-log-for-void.ts` | Producer | ✅ |
| 6 | `voidCutLogUseCase` | `void-cut-log.ts` | Consumer (worker) | — |
| 7 | `updateCutLogLinksUseCase` | `update-cut-log-links.ts` | Sync (no worker) | — |

Per-use-case behavior: see plan file `## Use case checklist` table.

## Typecheck error counts

| Workspace | Errors | Notes |
|---|---|---|
| @builders/domain | 0 | clean (after rebuilding dist for the payload-schema fix) |
| @builders/db | 0 | clean (after rebuilding dist for the new `updateCutLogLinks` primitive) |
| @builders/application | 0 | clean (the workspace this sweep changes) |
| @builders/lib | 0 | clean |
| @builders/relay | 0 | clean |
| @builders/worker | 0 | clean |
| @builders/web | 0 sweep-4-attributable | 3 pre-existing TS7006 implicit-any errors in `apps/web/modules/work-orders/record/panel/work-order-record-panel.tsx:539-542` |

**Total sweep-4 regressions: 0.**

## Files changed

### Created (10 new files in `packages/application/src/flooring/inventory/cut-logs/`)

- `errors.ts` — `CutLogExecutionError` class + 10-code `CutLogExecutionErrorCode` union, mirrors `StagedInventoryExecutionError` shape (constructor takes `{code, message, status, field?, payload?}`).
- `types.ts` — input + result shapes for every use case.
- `save-cut-log-pending-diff.ts` (#1, producer)
- `apply-cut-log-pending-diff.ts` (#2, consumer)
- `mark-cut-logs-for-finalize.ts` (#3, producer)
- `finalize-cut-logs.ts` (#4, consumer)
- `mark-cut-log-for-void.ts` (#5, producer)
- `void-cut-log.ts` (#6, consumer)
- `update-cut-log-links.ts` (#7, sync)
- `index.ts` — barrel re-exporting all 9 above.

### Modified

- `packages/application/src/flooring/inventory/index.ts` — added `export * from "./cut-logs/index.js"`.
- `packages/db/src/flooring/inventory/cut-logs/write-repository.ts` — added `updateCutLogLinks(tx, id, input)` primitive + `UpdateCutLogLinksInput` type. Uses `connect`/`disconnect` for both link sides; trusts input symmetry (use case validates).
- `packages/domain/src/queue/pending-save-cut-log-batch.ts` — added `id: z.string().uuid()` to `CutLogDraftPayload` (the missing field that broke retry idempotency). Updated header doc to call out the producer-stamps-id contract.

## Decisions baked in

1. **Producer/consumer asymmetry for pending-save.** Producer #1 does NOT mutate `flooring_cut_log` — it just validates, stamps tempIds → uuids, and writes the outbox event. Consumer #2 (the worker) is the only writer. Cut log status stays PENDING throughout the pending-save lifecycle; the outbox event is the in-flight marker.
2. **Producer/consumer symmetry for finalize and void.** Producers #3 + #5 flip status to QUEUED via `markCutLogsForFinalize` / `markCutLogForVoid` so the UI can grey out in-flight rows. Consumers #4 + #6 flip to FINAL/VOID respectively.
3. **Defensive re-validation in consumers.** Every consumer re-runs the relevant validator (`validateCutLogsDiff` / `validateCutLogFinalizeBatch` / `validateCutLogVoidRequest`) under the lock against a fresh snapshot, so any drift since the producer's optimistic check is caught and surfaces as a 409.
4. **`totalCutSum` recompute scope.**
   - Pending-save consumer (#2): recomputes after diff apply (cuts may have changed).
   - Finalize consumer (#4): does NOT recompute — finalize doesn't change `cut` values, just lifecycle fields. `totalCutSum` is already correct from the prior pending-save commit.
   - Void consumer (#6): recomputes after the void patch (cut is erased to "0", strictly decreasing the sum).
   - Link update (#7): does NOT recompute — links are independent of cut math.
5. **`assertCutSumWithinStartingStock` fires in the two recomputing consumers** (#2, #6). For void this is belt-and-suspenders (the sum strictly decreases). For pending-save it's the authoritative single-writer guard — even though the producer's diff validator already ran the check, the in-tx assertion catches any drift.
6. **Idempotency keys:**
   - Finalize: `cut-log-finalize:${inventoryId}:${sortedCutLogIds.join(",")}` — same input, same key.
   - Void: `cut-log-void:${inventoryId}:${cutLogId}` — single row, naturally unique.
   - Pending-save: `cut-log-pending-save:${inventoryId}:a:${addedIds}:m:${modifiedIds}:d:${deletedIds}:${requestedAt}` — `requestedAt` makes each save click a distinct intent, but the diff body is content-fingerprinted so two identical concurrent saves dedup.
7. **Update-links uses a tx but no inventory FOR UPDATE lock.** Per intent doc, link updates don't touch `totalCutSum`, so they don't need to coordinate with cut-math workers. The tx is just for atomic read+validate+write on the cut-log row.
8. **Cross-sweep extensions documented.** Two patches landed outside this sweep's nominal scope but were necessary to make sweep 4 functional:
   - `updateCutLogLinks` data primitive (sweep-3 extension) — sweep 3 didn't ship a link-only updater since pending-save doesn't carry links.
   - `id` field on `CutLogDraftPayload` (sweep-2 extension) — original schema was missing the producer-stamped UUID, which would have made retries non-idempotent.

## Verification commands run

| Command | Result |
|---|---|
| `npm run build --workspace @builders/domain` | clean (refresh dist after sweep-2 schema fix) |
| `npm run build --workspace @builders/db` | clean (refresh dist after `updateCutLogLinks` add) |
| `npm run typecheck --workspace @builders/application` | clean — the workspace this sweep changes |
| `npm run typecheck --workspace @builders/{domain,db,lib,relay,worker}` | all clean |
| `npm run typecheck --workspace @builders/web` | 3 pre-existing failures (work-orders module), 0 sweep-4 regressions |
| `npm run guard:prisma` | cut-log half stays clean; staged-inv sibling violation persists (out of scope) |
| `rg "^} from" packages/application/src/flooring/inventory/cut-logs/` (excluding `@builders/*` / relative / `node:`) | zero — application imports come only from the allowed sources (CLAUDE.md rule 1) |
| `rg "Request\\b\|Response\\b\|NextResponse\|NextRequest\|fetch\\(" packages/application/src/flooring/inventory/cut-logs/` | zero (rule 2 — no HTTP concerns; `validateCutLogVoidRequest` matches are domain function names, not HTTP types) |
| `rg -l "withDatabaseTransaction" packages/application/src/flooring/inventory/cut-logs/` | 7 files — every use case wraps in tx (rule 3) |
| `rg -l "createQueueOutboxEvent" packages/application/src/flooring/inventory/cut-logs/` | 3 files — exactly the producer use cases (#1, #3, #5) |

## Out of scope (next sweeps)

- **Sweep 5 (relay + worker + outbox topic registration):** three relay dispatchers (one per topic), three worker handlers (one per topic). Worker handlers will import the consumer use cases (#2, #4, #6) and call them with the parsed payload. **(Order corrected from earlier docs — relay/worker has to land before routes so producers don't write outbox events with no dispatcher; otherwise every "Save / Finalize / Void" click sits in PENDING forever.)**
- **Sweep 6 (API routes):** `POST /api/inventory/[id]/cut-logs/...` for queue-pending-save, queue-finalize, queue-void; separate sync route for link edits. Routes will instantiate the use cases from this sweep and translate `CutLogExecutionError` to HTTP responses.
- **Sweep 7 (loaders):** inventory record-view loaders surfacing pending vs finalized splits.
- **Sweep 8 (UI + controllers):** cut-logs section migration, selection state + finalize action, per-row void action, separate work-order-link controller.

## Spin-back checkpoint — ready for review

Per the user's "after this sweep we will spin back to confirm domain
and data layers are solid" — sweep-4 is the parallel checkpoint for the
application layer. Concrete things to review:

- The 7 use cases (file-by-file in `packages/application/src/flooring/inventory/cut-logs/`).
- The `updateCutLogLinks` data primitive in `packages/db/src/flooring/inventory/cut-logs/write-repository.ts`.
- The fixed `CutLogDraftPayload` schema in `packages/domain/src/queue/pending-save-cut-log-batch.ts`.
- The 10 error codes in `errors.ts` — does the taxonomy cover everything routes will need to map?
- The idempotency-key scheme for pending-save (current: includes `requestedAt`; alternative would be a content hash for stricter dedup).
- ~~The `applyCutLogPendingDiffUseCase`'s `coverageCut: null` placeholder~~ **RESOLVED 2026-04-26 (post-sweep-4 follow-up patch).** Threaded `coveragePerUnit` + `categorySlug` through the parent context fetcher; the consumer now calls `computeCutCoverage` per row to snapshot `coverageCut` at write time. Patch touched: `CutLogParentContext` (domain `diff/types.ts`) + `getInventoryParentContextForCutLogs` (db `read-repository.ts`) + `applyCutLogPendingDiffUseCase` (added the `recomputeCoverageCut` helper + wired it on every added row and on modified rows when the patch changes `cut`). Verified: domain + db + application typechecks all clean.

Once settled, sweep 5 wires the relay + worker + outbox topic
registration (no new business logic — it's plumbing the existing
consumer use cases to BullMQ). Sweep 6 (routes) is then straightforward
translation: parse body via `_validators.ts`, call producer use case,
translate `CutLogExecutionError.status` to the response.
