# Sweep 3 — Cut-Log Data Layer Audit (Pre-Implementation)

**Date:** 2026-04-26
**Scope:** Inventory the current `packages/db/src/flooring/inventory/cut-logs/` surface and the parent `FlooringInventory` `totalCutSum` writers. Compare against the canonical staged-inventory data-layer pattern. Flag every stale planning artifact and identify the gap between today's state and what sweep 3 needs to ship.
**Companion docs:** [cut-logs-finalize-and-void-intent.md](cut-logs-finalize-and-void-intent.md), [sweep-1-cut-log-schema-alteration-report.md](sweep-1-cut-log-schema-alteration-report.md), [sweep-2-cut-log-domain-rebuild-report.md](sweep-2-cut-log-domain-rebuild-report.md), [sweeps/alteration/3_data.md](sweeps/alteration/3_data.md) (empty placeholder).

## TL;DR

- Cut-log data layer has **4 files** (`index`, `shared`, `read-repository`, `write-repository`) and the 4-file shape is correct.
- **2 are stale** (`shared.ts` `cutLogRowSelect` and the `read-repository.ts` normalizer don't read or hydrate the 3 sweep-1 fields).
- **1 is incomplete** (`write-repository.ts` `finalizeCutLogRecord` doesn't stamp `isFinal` or `finalCutSequence`; `voidCutLogRecord` predates the sweep-2 voided-patch slimming).
- **1 file survives clean** (`index.ts` barrel — just needs new exports added).
- **Zero application-layer write paths to remove** — no code outside the data layer calls cut-log mutations today. The `updateInventoryTotalCutSum` primitive in `packages/db/src/flooring/inventory/write-repository.ts` exists and is wired transactionally, but has zero callers (correct — sweep 4 will add the use cases).
- **Zero stale outbox / queue helpers** — `packages/db/src/queues/outbox-repository.ts` is generic and clean.
- The dist artifacts (`packages/domain/dist/...`) still mention dropped sweep-2 functions; they regenerate on the next build and are not actionable.

## Reference: staged-inv data layer (the template)

`packages/db/src/flooring/imports/staged-inventory-rows/` is the closest analog and the file shape sweep-3 cut-logs will mirror.

| File | Role |
| --- | --- |
| `index.ts` | Barrel re-export of `shared`, `read-repository`, `write-repository`. |
| `shared.ts` | `StagedInventoryDbClient = PrismaClient \| Prisma.TransactionClient`, the typed `stagedInventoryRowSelect`, the inferred `StagedInventoryRowPayload`. |
| `read-repository.ts` | `normalizeStagedInventoryRow` (Prisma payload → domain `StagedInventoryRecord`); plus `getStagedInventoryById`, `listStagedInventoryByImport`, `listStagedInventoryForMaterialization` (worker-only, status="QUEUED" filter, raw payload, no normalization). |
| `write-repository.ts` | Input types (`Create*`, `Update*`, `Mark*`, `ApplyDiff*`), mutation primitives, and the two locked-transaction templates: `markStagedRowsForImport` (producer-side, mark-for-X) and `applyStagedInventoryRowsDiff` (sync diff-save). |

Cross-entity terminal-state primitive lives in the parent inventory write repo:

- `packages/db/src/flooring/inventory/write-repository.ts` → `materializeStagedRowsToInventory(tx, input)` — the worker-side function that bulk-inserts inventory rows AND flips source staged rows from QUEUED → IMPORTED in one transaction. The cut-log finalize worker will mirror this cross-entity pattern (it writes cut log rows AND `inventory.totalCutSum`).

### Convention summary

1. **`*DbClient` type alias** — `PrismaClient | Prisma.TransactionClient`. Every read/write function accepts `client: *DbClient = db` for composition. Worker-only functions accept `tx: Prisma.TransactionClient` (no default).
2. **Read/write split** — read functions in `read-repository.ts`, write functions in `write-repository.ts`. Write functions may call read functions to reload post-state.
3. **Normalizer** — pure function `normalize*Row(payload)` that flattens Prisma's join graph into the domain `*Row` type. Imports pure domain helpers (formatters, `computeInventoryBalance`, etc.) per the `packages/db/CLAUDE.md` carve-out, NEVER throwing rules.
4. **Mark-for-X primitive** — pre-read eligible rows (under the lock), then bulk `updateMany` with the same `WHERE` clause to flip status. Returns `{ markedRowIds, skippedRowIds }`.
5. **Apply-diff primitive** — caller pre-assigns UUIDs to drafts (via `assignCutLogDiffIds`-style domain helper); function does `deleteMany` → `createMany` (with pre-assigned ids) → per-row updates → reload. Returns the post-state.
6. **Cross-entity worker primitive** — `createMany` + re-read for DB-assigned sequences (e.g. `inventoryNumber`) + `updateMany` to flip source rows to terminal state. All inside one transaction the caller opens via `withDatabaseTransaction`.
7. **Outbox writer** — `createQueueOutboxEvent(input, client?)` already exists in `packages/db/src/queues/outbox-repository.ts`. Idempotent via `idempotencyKey` unique constraint (catches P2002, re-fetches existing, returns `wasDuplicate`). Cut-log producers will reuse this directly — no new outbox helper needed.
8. **`withDatabaseTransaction`** lives at `packages/db/src/client.ts`, thin wrapper around `db.$transaction`.

## Current cut-log data layer

### `packages/db/src/flooring/inventory/cut-logs/`

| File | Verdict | Notes |
| --- | --- | --- |
| `index.ts` | KEEP, extend exports | Barrel — must surface every new file added in sweep 3. |
| `shared.ts` | **STALE** | `cutLogRowSelect` is missing the 3 new sweep-1 columns (`cutLogNumber`, `finalCutSequence`, `isFinal`). `CutLogRowPayload` therefore can't be normalized into the full domain `CutLogRow` (sweep-2 added those 3 fields). Root cause of every downstream gap. |
| `read-repository.ts` | **INCOMPLETE** | `normalizeCutLogRow` predates sweep 1 — the function doesn't reference the new fields, and the SELECT doesn't request them. Once `shared.ts` is fixed, the normalizer needs three new lines. The existing `getCutLogById` / `listCutLogsByInventoryId` shapes are fine. **Missing entirely:** the worker-side reads (mirror of `listStagedInventoryForMaterialization`) — needed for `validateCutLogsDiff` (diff-save), the finalize batch fetcher, the void single-row fetcher, the parent context fetcher, and the `MAX(finalCutSequence)` lookup. |
| `write-repository.ts` | **INCOMPLETE** | `finalizeCutLogRecord` predates sweep 1: doesn't accept `isFinal` or `finalCutSequence`, doesn't stamp them. `voidCutLogRecord` correctly uses `buildVoidedCutLogPatch` BUT the patch shape changed in sweep 2 (no longer erases `before`/`after`/`isWaste`/links — TypeScript should already catch this if there's a strict shape mismatch). `createCutLogRecord` and `updateCutLogPending` are structurally fine. **Missing entirely:** all the producer-side mark-for-X primitives (`markCutLogsForFinalize`, `markCutLogForVoid`), the diff-apply primitive (`applyCutLogPendingSaveDiff`), and the finalize batch primitive (`finalizeCutLogBatch`) that allocates `finalCutSequence` + computes `before`/`after`. |

### Parent inventory writers — `totalCutSum`

`packages/db/src/flooring/inventory/write-repository.ts`:

- `updateInventoryTotalCutSum(id, input, client?)` — primitive exists, has zero callers. Comment in source says "transactional helper — only called inside cut-log write transactions" / "reserved for the cut-log application layer."
- **Single-writer rule status:** vacuously satisfied today (no callers). Sweep-3 cut-log write functions will call this inside their per-inventory `FOR UPDATE` lock; sweep-4 use cases will compose them.
- **No other writers** to `totalCutSum` exist outside this primitive — confirmed by ripgrep.

### Cut-log mentions outside the cut-log data folder

- `packages/db/src/queues/outbox-repository.ts` — generic, no cut-log specifics. Reuses cleanly.
- `packages/application/src/flooring/inventory/delete-inventory.ts` — only reads `cutLogsCount` for the parent-inventory deletion guard. Not a write path.
- `apps/worker/`, `apps/relay/`, `apps/web/` — zero direct calls to cut-log data primitives.

## Stale code from previous plans

Material findings: **none**.

- The pre-sweep-2 dropped functions (`assertCutLogUserTransition`, `isCutLogMostRecent`, `isCutLogUserTransitionAllowed`) are deleted from the domain source. The `dist/` artifacts still mention them but regenerate on next build.
- The pre-sweep-2 deleted `finalize-payload.ts` is also still in `dist/` but regenerates similarly.
- No old "previous plan" worker / outbox / dispatcher scaffolding exists outside the (clean) generic outbox repo.
- The pre-sweep-1 SELECT shape in `shared.ts` is the only "real" stale-ness — and it's a one-line fix (add three field names).

## Survives untouched

- `packages/db/src/queues/outbox-repository.ts` — generic, clean, idempotent.
- `packages/db/src/flooring/inventory/write-repository.ts` — `updateInventoryTotalCutSum` primitive shape is correct as-is.
- `packages/db/src/client.ts` — `withDatabaseTransaction` helper.
- `packages/domain/src/flooring/inventory/cut-logs/category-math.ts` — pure `computeCutCoverage`, used by the worker when recomputing `coverageCut` after a cut change.

## Gap analysis — what cut-log data layer is missing vs the staged-inv pattern

| Concept | Staged-inv has | Cut-log has |
| --- | --- | --- |
| `*DbClient` alias | `StagedInventoryDbClient` | **HAVE** (`CutLogDbClient`) |
| Typed select | `stagedInventoryRowSelect` | **HAVE but stale** (missing 3 sweep-1 fields) |
| Normalizer | `normalizeStagedInventoryRow` (full join graph) | **HAVE but stale** (doesn't hydrate 3 sweep-1 fields) |
| Per-id read | `getStagedInventoryById` | **HAVE** |
| Per-parent read | `listStagedInventoryByImport` | **HAVE** (`listCutLogsByInventoryId`) |
| Worker-side raw read (status-filtered) | `listStagedInventoryForMaterialization` | **MISSING** |
| Mark-for-X primitive (producer-side) | `markStagedRowsForImport` | **MISSING** (need 2 — `markCutLogsForFinalize`, `markCutLogForVoid`) |
| Apply-diff primitive | `applyStagedInventoryRowsDiff` | **MISSING** (`applyCutLogPendingSaveDiff`) |
| Cross-entity terminal-state primitive | `materializeStagedRowsToInventory` (in inventory write-repo) | **MISSING** (need `finalizeCutLogBatch` and the void-applier) |
| `MAX` lookup | N/A (staged-inv doesn't have a per-parent ordinal) | **MISSING** (`getMaxFinalCutSequenceForInventory`) |
| Parent context fetcher (in-tx) | implicit (caller already has the import row) | **MISSING** (`getInventoryParentContextForCutLogs`) — needed for `validateCutLogsDiff` |

## What's needed for sweep-3 to consume sweep-2 deliverables

Sweep 2 shipped these helpers; sweep-3 data writes plug into them:

- `nextFinalCutSequence(currentMax: number | null) → number` — finalize worker calls per-row after the locked `MAX(finalCutSequence)` query.
- `computeTotalCutSum(rows) → string` — every write that mutates a `cut` value must recompute and persist via `updateInventoryTotalCutSum`.
- `assertCutSumWithinStartingStock({ totalCutSum, startingStock })` — invariant guard before commit.
- `validateCutLogsDiff(diff, resolution, parent)` — diff-save data primitive runs this AFTER acquiring the lock + reading the snapshot, and surfaces the issues to the worker.
- `validateCutLogFinalizeBatch(rows)` — finalize data primitive runs this after re-reading rows under the lock (defensive — producer also runs it pre-outbox).
- `validateCutLogVoidRequest(row)` — void data primitive runs this after re-reading the row under the lock.
- `buildVoidedCutLogPatch()` — void worker applies this directly.
- `getCutLogFinalizabilityBlocker(row)` — embedded in `validateCutLogFinalizeBatch`; the data layer doesn't call it directly.
- `assignCutLogDiffIds(entries, generateId)` — application use case (sweep 4) calls this BEFORE writing the outbox event so the IDs are stamped in the payload; the data primitive `applyCutLogPendingSaveDiff` consumes pre-stamped IDs.

## One small domain extension proposed for sweep 3

`before` / `after` for finalize is sequential subtraction over the batch in `finalCutSequence` order, starting from `startingStock - sum(already-finalized cuts that come before this one)`. Two reasonable homes:

1. **Inline in the data primitive** (`finalizeCutLogBatch`) — fastest, most local, no domain extension.
2. **Pure helper in domain** (`packages/domain/src/flooring/inventory/cut-logs/finalize-math.ts`) — mirrors `cut-sum-math.ts` and `final-cut-sequence.ts`. Reusable; testable independently of Prisma.

**Recommendation:** option 2. The math is small but the contract is meaningful (and the per-batch loop is non-obvious). Adding a small `finalize-math.ts` during sweep 3 is consistent with the carve-out — domain ships pure math, data composes it. Will be flagged as an in-flight domain extension in the sweep-3 report so the user can review when "we spin back to confirm domain and data layers are solid."

## Proposed sweep-3 file layout

```
packages/db/src/flooring/inventory/cut-logs/
├── index.ts              # barrel — extended
├── shared.ts             # cutLogRowSelect: +cutLogNumber, +finalCutSequence, +isFinal
├── read-repository.ts    # normalizer +3 fields; ADD: listCutLogsForPendingSaveDiff, listCutLogsForFinalizeBatch, getCutLogForVoid, getCutLogsForFinalize, getInventoryParentContextForCutLogs, getMaxFinalCutSequenceForInventory
└── write-repository.ts   # finalizeCutLogRecord +isFinal/+finalCutSequence; voidCutLogRecord aligned to sweep-2 patch shape; ADD: markCutLogsForFinalize, markCutLogForVoid, applyCutLogPendingSaveDiff, finalizeCutLogBatch, applyVoidToCutLog

packages/db/src/flooring/inventory/
└── write-repository.ts   # updateInventoryTotalCutSum already correct — no changes (verify)

packages/domain/src/flooring/inventory/cut-logs/
└── finalize-math.ts      # NEW (small extension): computeBeforeAfterForFinalize
```

## Application-layer paths to remove

**None.** Cut logs are not yet wired into any application use case. The mutation surface goes live in sweep 4.

## Out of scope for sweep 3

- Application use cases (sweep 4).
- API routes (sweep 5).
- Outbox topic registrations + relay dispatchers + worker handlers (sweep 6) — the cut-log workers consume the data primitives this sweep ships.
- Loaders, controllers, UI (sweep 7 / 8).
- Fixing `staged-inventory-rows/types.ts` Prisma import (separate cleanup, unrelated to cut logs).
