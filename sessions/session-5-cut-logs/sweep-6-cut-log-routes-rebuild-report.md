# Sweep 6 — Cut-Log API Routes Report

**Date:** 2026-04-26
**Plan:** `~/.claude/plans/okay-now-we-need-abundant-glade.md`
**Reference template:** [apps/web/app/api/imports/[id]/staged-inventory-rows/mark-for-import/route.ts](../apps/web/app/api/imports/%5Bid%5D/staged-inventory-rows/mark-for-import/route.ts) (producer pattern), [apps/web/app/api/inventory/[id]/primary/section/route.ts](../apps/web/app/api/inventory/%5Bid%5D/primary/section/route.ts) (sync-with-optimistic-lock pattern), [apps/web/app/api/imports/_validators.ts](../apps/web/app/api/imports/_validators.ts) (validators).
**Sweep doc:** `docs/sweeps/alteration/5_api_routes.md` (still empty placeholder; numbering predates the order correction — this report supersedes).
**Branch:** `staging`

## Headlines

- **4 cut-log API routes shipped** under `apps/web/app/api/inventory/[id]/cut-logs/`. Each follows the canonical mutation gauntlet (`applyRoutePolicy` → `parseMutationEnvelope` → `enforceMutationReceipt` → `withMutationTelemetry` → `finalizeMutationReceipt` → `routeJson` / `routeError`).
- **Single `_validators.ts`** at the cut-logs root with 4 body-shape validators. Mirrors the staged-inv `_validators.ts` exactly (throw-style with field paths, body-shape only, no business rules).
- **2 new error codes** added to sweep 4's `CutLogExecutionErrorCode` union (`CUT_LOG_VALIDATION_FAILED`, `CUT_LOG_DIFF_VALIDATION_FAILED`) — small cross-sweep extension to mirror staged-inv's error-code pair.
- **Sweep-6 typecheck regressions: 0.** `@builders/application` and `@builders/web` clean for new files. The 3 pre-existing work-orders TS7006 errors in `apps/web/modules/work-orders/...` are unchanged.
- **Gauntlet verification** ran via ripgrep — every one of the 5 gauntlet helpers (`applyRoutePolicy`, `parseMutationEnvelope`, `enforceMutationReceipt`, `finalizeMutationReceipt`, `withMutationTelemetry`) appears in every one of the 4 new route files. No accidentally-skipped gauntlet step.
- **HTTP route surface** now reachable by sweep-8 controllers: pending-save, finalize, void, link-update.

## Routes shipped

| Route | HTTP | Status | Use case | Body shape |
|---|---|---|---|---|
| [/api/inventory/[id]/cut-logs/section](../apps/web/app/api/inventory/%5Bid%5D/cut-logs/section/route.ts) | PATCH | 202 | `saveCutLogPendingDiffUseCase` | `{ diff, mutation }` |
| [/api/inventory/[id]/cut-logs/finalize](../apps/web/app/api/inventory/%5Bid%5D/cut-logs/finalize/route.ts) | POST | 202 | `markCutLogsForFinalizeUseCase` | `{ cutLogIds[], mutation }` |
| [/api/inventory/[id]/cut-logs/void](../apps/web/app/api/inventory/%5Bid%5D/cut-logs/void/route.ts) | POST | 202 | `markCutLogForVoidUseCase` | `{ cutLogId, mutation }` |
| [/api/inventory/[id]/cut-logs/links](../apps/web/app/api/inventory/%5Bid%5D/cut-logs/links/route.ts) | PATCH | 200 | `updateCutLogLinksUseCase` | `{ cutLogId, workOrderId, workOrderItemId, mutation: {…, expectedUpdatedAt} }` |

## Typecheck error counts

| Workspace | Errors | Notes |
|---|---|---|
| @builders/domain | 0 | clean |
| @builders/db | 0 | clean |
| @builders/application | 0 | clean (after the error-code extension + dist rebuild) |
| @builders/lib | 0 | clean |
| @builders/relay | 0 | clean |
| @builders/worker | 0 | clean |
| @builders/web | 0 sweep-6-attributable | 3 pre-existing TS7006 errors in `apps/web/modules/work-orders/record/panel/work-order-record-panel.tsx:539-542` |

**Total sweep-6 regressions: 0.**

## Gauntlet verification

```
$ rg -l "applyRoutePolicy"        apps/web/app/api/inventory/[id]/cut-logs/  → 4 hits ✓
$ rg -l "parseMutationEnvelope"   apps/web/app/api/inventory/[id]/cut-logs/  → 4 hits ✓
$ rg -l "enforceMutationReceipt"  apps/web/app/api/inventory/[id]/cut-logs/  → 4 hits ✓
$ rg -l "finalizeMutationReceipt" apps/web/app/api/inventory/[id]/cut-logs/  → 4 hits ✓
$ rg -l "withMutationTelemetry"   apps/web/app/api/inventory/[id]/cut-logs/  → 4 hits ✓
```

Every route uses every gauntlet helper. Per `apps/web/app/CLAUDE.md` rule 4 ("every mutation route uses the full mutation lifecycle"), all 4 routes are compliant.

## Files changed

### Created (5 files)

- `apps/web/app/api/inventory/[id]/cut-logs/_validators.ts` — 4 body-shape validators + private throw helpers. Mirrors `apps/web/app/api/imports/_validators.ts`.
- `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` — PATCH 202, calls `saveCutLogPendingDiffUseCase`. Producer.
- `apps/web/app/api/inventory/[id]/cut-logs/finalize/route.ts` — POST 202, calls `markCutLogsForFinalizeUseCase`. Producer.
- `apps/web/app/api/inventory/[id]/cut-logs/void/route.ts` — POST 202, calls `markCutLogForVoidUseCase`. Producer.
- `apps/web/app/api/inventory/[id]/cut-logs/links/route.ts` — PATCH 200, reads `getCutLogById` + `assertExpectedUpdatedAt` then calls `updateCutLogLinksUseCase`. Sync.

### Modified (1 cross-sweep extension)

- `packages/application/src/flooring/inventory/cut-logs/errors.ts` — added `CUT_LOG_VALIDATION_FAILED` and `CUT_LOG_DIFF_VALIDATION_FAILED` to the `CutLogExecutionErrorCode` union. Mirrors staged-inv's `STAGED_VALIDATION_FAILED` / `STAGED_DIFF_VALIDATION_FAILED` pair. Two strings, no constructor change.

### Verified unchanged

- All shared route helpers (`applyRoutePolicy`, `parseMutationEnvelope`, `enforceMutationReceipt`, `finalizeMutationReceipt`, `assertExpectedUpdatedAt`, `withMutationTelemetry`, `routeJson`, `routeError`) — fully reused.
- All sweep-4 use cases — unchanged shapes; routes call them with the input shapes sweep 4 specified.
- All sweep-5 worker plumbing — unchanged.
- `apps/web/app/api/inventory/_validators.ts` (existing inventory validators for the parent inventory routes) — untouched.

## Decisions baked in (matches plan exactly)

1. **Tool slug = `"warehouse"`** for all 4 routes. Confirmed at impl time by reading `apps/web/app/api/inventory/[id]/primary/section/route.ts`. Same as imports.
2. **3 producers return 202 Accepted, 1 sync route returns 200 OK.** Producer routes write outbox events and return immediately; the worker applies later. Sync link route runs in its own tx and returns the updated row.
3. **`expectedUpdatedAt` only required for the link route.** Other routes don't need parent-level optimistic lock — the producer use case takes the per-inventory `FOR UPDATE` and the diff carries per-row `expectedUpdatedAt` for pending-save.
4. **Link route uses the read-then-assert-then-call pattern** (mirrors `inventory/[id]/primary/section/route.ts`). Reads the cut log via `getCutLogById`, calls `assertExpectedUpdatedAt`, validates the cut log belongs to the path's inventory id, then calls the use case. This avoids extending the sweep-4 use case input shape.
5. **Rate-limit scopes follow staged-inv defaults:** 30/10min for producers (`finalize`, `void`); 50/10min for diff-style (`section`, `links`).
6. **Telemetry actions:** `inventory.cut-logs.section.replace`, `inventory.cut-logs.finalize`, `inventory.cut-logs.void`, `inventory.cut-logs.links.update`.
7. **Error code extension scoped to sweep 6.** No code in domain or data layer touched — just the application layer's error union.

## Idempotency + receipt strategy

Every route hits `enforceMutationReceipt` → `finalizeMutationReceipt`. The mutation envelope's `idempotencyKey` is the dedup token. If the same `idempotencyKey` arrives twice within the receipt window:

- **Producers:** the second request returns the cached 202 + outbox event id from the first attempt. The outbox event itself ALSO has its own idempotency key in the producer use case (different from this HTTP-level one), so even if the receipt cache misses, the outbox `wasDuplicate=true` path catches it.
- **Sync link route:** the second request returns the cached 200 + cut log row from the first attempt.

Both layers of idempotency working together means a user double-clicking Save / Finalize / Void / link-update produces exactly one effect.

## What's now reachable from the browser

Pre-sweep-6, the only way to drive the cut-log pipeline was the smoke
script that called producer use cases directly. Post-sweep-6:

```
fetch("/api/inventory/<id>/cut-logs/section", { method: "PATCH", body: JSON.stringify({
  diff: { added: [...], modified: [...], deleted: [...] },
  mutation: { idempotencyKey: <uuid> },
})})

fetch("/api/inventory/<id>/cut-logs/finalize", { method: "POST", body: JSON.stringify({
  cutLogIds: [<uuid>, <uuid>, ...],
  mutation: { idempotencyKey: <uuid> },
})})

fetch("/api/inventory/<id>/cut-logs/void", { method: "POST", body: JSON.stringify({
  cutLogId: <uuid>,
  mutation: { idempotencyKey: <uuid> },
})})

fetch("/api/inventory/<id>/cut-logs/links", { method: "PATCH", body: JSON.stringify({
  cutLogId: <uuid>,
  workOrderId: <uuid> | null,
  workOrderItemId: <uuid> | null,
  mutation: { idempotencyKey: <uuid>, expectedUpdatedAt: <iso-string> },
})})
```

Sweep-8 controllers will fire these from the cut-logs section UI.

## Optional follow-up: HTTP-level smoke

The smoke script (`packages/db/scripts/smoke-cut-log-pipeline.mjs`)
currently calls producer use cases directly. With routes shipped, you
could pivot the smoke to fire `fetch` requests instead. Tradeoff:
exercises auth + receipt + telemetry on the way in (more coverage),
but requires running `apps/web` locally during the smoke (more setup).
The existing direct-call smoke remains valuable as a use-case-layer
contract test. Both are useful; ship whichever suits the next
debugging need.

## Verification commands run

| Command | Result |
|---|---|
| `npm run build --workspace @builders/application` | clean (refresh dist after error-code add) |
| `npm run typecheck --workspace @builders/application` | clean |
| `npm run typecheck --workspace @builders/web` | 3 pre-existing failures (work-orders module), 0 sweep-6 regressions |
| `npm run guard:prisma` | unchanged — only the staged-inv sibling violation persists (out of scope) |
| `rg -l "applyRoutePolicy" apps/web/app/api/inventory/[id]/cut-logs/` | all 4 routes |
| `rg -l "parseMutationEnvelope" apps/web/app/api/inventory/[id]/cut-logs/` | all 4 routes |
| `rg -l "enforceMutationReceipt" apps/web/app/api/inventory/[id]/cut-logs/` | all 4 routes |
| `rg -l "finalizeMutationReceipt" apps/web/app/api/inventory/[id]/cut-logs/` | all 4 routes |
| `rg -l "withMutationTelemetry" apps/web/app/api/inventory/[id]/cut-logs/` | all 4 routes |

## Out of scope (next sweeps)

- **Sweep 7 (record-view loaders):** loaders that compose the cut-logs
  section's read shape — pending vs finalized splits, queued indicator,
  `finalCutSequence` ordering for the finalized history.
- **Sweep 8 (UI + controllers):** cut-logs section migration to the new
  primitives, selection state + finalize action, per-row void action,
  the separate link-edit controller add-on. This is where the routes
  shipped today get actually called from the browser.
- Fixing `staged-inventory-rows/types.ts` Prisma import (separate
  cleanup, unrelated).
- Adding the work-order-link DB CHECK constraint (deferred indefinitely).
