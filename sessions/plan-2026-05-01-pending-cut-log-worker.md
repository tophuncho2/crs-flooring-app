# Plan — Pending Cut Log Worker hardening

**Date:** 2026-05-01
**Description (locked):** [worker-descriptions/cut-logs/pending-cut-log-worker/description.md](worker-descriptions/cut-logs/pending-cut-log-worker/description.md)
**Predecessor:** Schema migration shipped earlier — `before` and `after` are nullable on `flooring_cut_log`. Type propagation clean. Code paths still write old values; this plan is what changes that.
**Scope is hard:** pending worker only. Finalize worker and void flow are NOT touched here.
**Non-scope:** anything finalize, anything void, the inventory cut-log section UI cleanup (those are separate). PDF generation is also out.

---

## Commit shape

One commit, code-only. Files in 4 layers:

| Layer | File | What changes |
|---|---|---|
| Application | [packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts) | Hoist `assertCutLogLinkageSymmetry` out of the per-draft loop |
| Application | [packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts) | Read coverage data per touched inventory; re-validate deletes under the lock; enrich diff with derived `coverageCut`; pass to data layer; add error log on `markFailed` swallow |
| Data | [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts) | `applyWorkOrderItemCutLogPendingDiff` accepts pre-derived `coverageCut`; stops computing/writing `before`/`after`; uses `skipDuplicates` on `createMany`; updates also patch `coverageCut` when present |
| UI | [apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx) | `?? "—"` fallback for `before`/`after` rendering on PENDING rows |

Rough size: ~5 files, ~150 lines net change. No new files.

---

## Step-by-step plan

### Step 1 — Producer: hoist linkage-symmetry assertion

[packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts), lines 83-94 currently:

```ts
const addedWithIds = assignDraftIds(input.diff.added, randomUUID)
const tempIdMap: Record<string, string> = {}
for (const draft of addedWithIds) {
  tempIdMap[draft.tempId] = draft.id
  // Defensive symmetry check on each draft's link pair (always set
  // both, never neither) — surfaces any future drift in the producer's
  // stamping logic.
  assertCutLogLinkageSymmetry({
    workOrderId: input.workOrderId,
    workOrderItemId: input.workOrderItemId,
  })
}
```

Change to:

```ts
// Linkage symmetry is constant across all drafts (every draft inherits
// the WOMI's workOrderId + the WOMI's id), so assert once up front.
assertCutLogLinkageSymmetry({
  workOrderId: input.workOrderId,
  workOrderItemId: input.workOrderItemId,
})

const addedWithIds = assignDraftIds(input.diff.added, randomUUID)
const tempIdMap: Record<string, string> = {}
for (const draft of addedWithIds) {
  tempIdMap[draft.tempId] = draft.id
}
```

### Step 2 — Data layer: rewrite `applyWorkOrderItemCutLogPendingDiff`

[packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts), function lines 70-160.

#### 2a. Update the input type

```ts
export type WorkOrderCutLogPendingDraftInput = {
  id: string
  tempId: string
  inventoryId: string
  cut: string
  coverageCut: string | null  // ← NEW: derived by consumer, passed in
  isWaste: boolean
  notes: string
}

export type WorkOrderCutLogPendingUpdateInput = {
  id: string
  expectedUpdatedAt: string
  patch: {
    cut?: string
    coverageCut?: string | null  // ← NEW: present when cut changed (and only then)
    isWaste?: boolean
    notes?: string
  }
}
```

#### 2b. Drop the before/after computation block

Remove lines 87-104 (the `inventories` findMany, the `remainingByInventory` map, the `runningRemaining` accumulator, the `draftsByInventory` regrouping). All of that was for computing `before`/`after`. Gone.

#### 2c. Build creates with the new shape

Replace the create-row construction:

```ts
if (input.drafts.length > 0) {
  const createRows: Array<Prisma.FlooringCutLogCreateManyInput> = input.drafts.map((draft) => ({
    id: draft.id,
    inventoryId: draft.inventoryId,
    workOrderId: input.workOrderId,
    workOrderItemId: input.workOrderItemId,
    cut: draft.cut,
    coverageCut: draft.coverageCut,
    isWaste: draft.isWaste,
    notes: draft.notes ? draft.notes : null,
    // before, after, finalCutSequence, cost, freight all default-null per schema
    // status defaults to PENDING; isFinal defaults to false; void defaults to false
    // cutLogNumber is DB-generated via sequence
  }))

  await tx.flooringCutLog.createMany({
    data: createRows,
    skipDuplicates: true,
  })
}
```

Notice: no explicit `before`, `after`, `cost`, `freight`, `status`, `isFinal`, `void`, `finalCutSequence` — Prisma uses the schema defaults (null for nullable, declared default for the rest). Cleaner row construction.

#### 2d. Update path: include coverageCut when present

```ts
for (const update of input.updates) {
  await tx.flooringCutLog.update({
    where: { id: update.id },
    data: {
      ...(update.patch.cut !== undefined ? { cut: update.patch.cut } : {}),
      ...(update.patch.coverageCut !== undefined ? { coverageCut: update.patch.coverageCut } : {}),
      ...(update.patch.isWaste !== undefined ? { isWaste: update.patch.isWaste } : {}),
      ...(update.patch.notes !== undefined
        ? { notes: update.patch.notes ? update.patch.notes : null }
        : {}),
    },
  })
}
```

The conditional spread already handles "field not in patch" — `coverageCut: undefined` would also be a "no change" signal in Prisma, but the explicit conditional is clearer and matches the existing style.

### Step 3 — Consumer: read coverage data, validate deletes, enrich diff

[packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts).

The current shape:

```ts
const inventoryIds = await getInventoriesForCutLogDiff(...)
await lockInventoriesForCutLogBatch(c, inventoryIds)

await applyWorkOrderItemCutLogPendingDiff(c, {
  workOrderId: payload.workOrderId,
  workOrderItemId: payload.workOrderItemId,
  drafts: payload.diff.added,
  updates: payload.diff.modified,
  deletes: payload.diff.deleted,
})

const recomputed = await recomputeAndPersistTotalCutSums(c, inventoryIds)
// ... assertion ...
await markWorkOrderItemStatus(payload.workOrderItemId, "IDLE", c)
```

Change to (psuedocode):

```ts
const inventoryIds = await getInventoriesForCutLogDiff(...)
await lockInventoriesForCutLogBatch(c, inventoryIds)

// 1. Read coverage data for every touched inventory
const coverageRows = await c.flooringInventory.findMany({
  where: { id: { in: inventoryIds } },
  select: { id: true, categorySlug: true, coveragePerUnit: true },
})
const coverageById = new Map(coverageRows.map((r) => [r.id, {
  categorySlug: r.categorySlug,
  coveragePerUnit: r.coveragePerUnit === null ? null : r.coveragePerUnit.toString(),
}]))

// 2. Re-validate deletes under the lock (close the FINAL-delete gap)
if (payload.diff.deleted.length > 0) {
  const deleteIds = payload.diff.deleted.map((d) => d.id)
  const existingRows = await c.flooringCutLog.findMany({
    where: { id: { in: deleteIds } },
    select: { id: true, status: true, isFinal: true, void: true },
  })
  for (const row of existingRows) {
    try {
      assertCutLogDeleteAllowed(row)
    } catch (err) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_DELETE_NOT_ALLOWED",
        message: "Cannot delete a finalized or voided cut log; void it instead",
        status: 409,
        payload: { cutLogId: row.id, status: row.status, isFinal: row.isFinal, void: row.void },
      })
    }
  }
  // (If a row in deleteIds doesn't exist, the data layer's deleteMany is a no-op
  // for missing ids — idempotent under retry.)
}

// 3. Enrich drafts with derived coverageCut
const enrichedDrafts = payload.diff.added.map((draft) => {
  const cov = coverageById.get(draft.inventoryId)
  const coverageCut = cov === undefined
    ? null
    : computeCutCoverageForCreate({ cut: draft.cut, coveragePerUnit: cov.coveragePerUnit, categorySlug: cov.categorySlug })
  return { ...draft, coverageCut }
})

// 4. Enrich updates: re-derive coverageCut when cut changed
//    Need each update's parent inventory id to look up coverage data.
//    Pre-read parent inventoryId per update id (under the lock).
const updateRows = payload.diff.modified.length > 0
  ? await c.flooringCutLog.findMany({
      where: { id: { in: payload.diff.modified.map((u) => u.id) } },
      select: { id: true, inventoryId: true },
    })
  : []
const inventoryByCutLogId = new Map(updateRows.map((r) => [r.id, r.inventoryId]))

const enrichedUpdates = payload.diff.modified.map((update) => {
  if (update.patch.cut === undefined) return update
  const invId = inventoryByCutLogId.get(update.id)
  if (invId === undefined) return update // row gone — data layer's update will throw
  const cov = coverageById.get(invId)
  const coverageCut = cov === undefined
    ? null
    : computeCutCoverageForCreate({ cut: update.patch.cut, coveragePerUnit: cov.coveragePerUnit, categorySlug: cov.categorySlug })
  return { ...update, patch: { ...update.patch, coverageCut } }
})

// 5. Apply the enriched diff
await applyWorkOrderItemCutLogPendingDiff(c, {
  workOrderId: payload.workOrderId,
  workOrderItemId: payload.workOrderItemId,
  drafts: enrichedDrafts,
  updates: enrichedUpdates,
  deletes: payload.diff.deleted,
})

// 6. Recompute totalCutSum, assert invariant — unchanged
const recomputed = await recomputeAndPersistTotalCutSums(c, inventoryIds)
// ... existing assertion code ...

await markWorkOrderItemStatus(payload.workOrderItemId, "IDLE", c)
```

Helper `computeCutCoverageForCreate` is a thin wrapper around the domain's `computeCutCoverage` that returns the result as `string | null` (formatted to 2 decimals when non-null). Inline it locally or add a tiny helper in `@builders/domain` if it's clean.

Actually — `computeCutCoverage` returns `number | null`. We want `string | null` to match the column type. Two options:
- Inline the conversion: `cov === null ? null : cov.toFixed(2)`
- Add a `string`-returning sibling in domain (e.g. `formatCutCoverage`) — only worth it if used in 2+ places

Inline it for now. One call site in the consumer.

### Step 4 — Consumer: error log on markFailed swallow

Same file, function `markWorkOrderItemFailedFromCutLogDiff`:

```ts
export async function markWorkOrderItemFailedFromCutLogDiff(
  workOrderItemId: string,
  client?: Prisma.TransactionClient,
): Promise<void> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    try {
      await markWorkOrderItemStatus(workOrderItemId, "FAILED", c)
    } catch (err) {
      log.error(
        { workOrderItemId, err: serializeError(err) },
        "Failed to mark WOMI FAILED after worker error",
      )
      // Swallow on purpose: the worker already has the original error to surface.
      // Log gives observability so stuck WOMIs can be paged on later.
    }
  })
}
```

Need `log` from `@builders/lib`. Check the import surface — same `structuredLogger` already used in worker processors. Likely `import { logger } from "@builders/lib"` or similar — verify the existing imports in the worker processors and follow the same pattern.

### Step 5 — UI fallback for null `before`/`after`

[apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx:182, 200](apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx:182). Current:

```tsx
case "before":
  return <span className={`tabular-nums ${decoration}`}>{row.before}</span>
case "after":
  return <span className={`tabular-nums ${decoration}`}>{row.after}</span>
```

Change to:

```tsx
case "before":
  return <span className={`tabular-nums ${decoration}`}>{row.before ?? "—"}</span>
case "after":
  return <span className={`tabular-nums ${decoration}`}>{row.after ?? "—"}</span>
```

Pending rows now display `—` for before/after. Final rows display the stamped value as before.

### Step 6 — Build + typecheck

- `npm run build --workspace @builders/domain`
- `npm run build --workspace @builders/db`
- `npm run typecheck` (root)

### Step 7 — Manual UI smoke test

1. Restart `dev:worker` so it picks up the rebuilt `@builders/db` dist.
2. Open a WOMI, add a pending cut on an inventory in a coverage-supporting category (e.g. `vinyl-plank`) with `coveragePerUnit` set. Save.
3. Verify: row appears in the section. `before`/`after` cells show `—`. `coverageCut` shows the derived value.
4. Add a second pending cut on a non-coverage-supporting category (or one with `coveragePerUnit = null`). Save.
5. Verify: row appears. Both `before`/`after` show `—`, `coverageCut` shows blank/`—`.
6. Edit the first row's `cut` value. Save.
7. Verify: `coverageCut` re-derives to match the new cut. Other fields unchanged.
8. Edit only the `notes` of a row. Save.
9. Verify: `coverageCut` did NOT change (we only re-derive when `cut` changes).
10. Try to delete a pending row. Should succeed.
11. (If you have a test final cut log) Try to "delete" a final via direct API hack (or trust the ProducedeleteUI gates this). Confirm the consumer rejects it under the lock.

---

## Risk + rollback

- **Schema-side risk: zero.** Migration already shipped; columns are nullable.
- **Existing pending rows in production:** they have non-null `before`/`after` from the OLD computation. They keep those values until they finalize, at which point the (yet-to-be-fixed) finalize worker will re-stamp. No backfill needed.
- **Existing pending rows in dev:** same. Or you can clear the dev state if you want a clean slate.
- **Rollback:** revert the commit. The schema change stays (harmless — null still allowed). The worker reverts to the old behavior of computing before/after at pending time. No data corruption either way.

---

## After this commit lands

The pending worker is solidified. Open follow-ups (NOT in this plan, but worth tracking):

1. **Inventory cut-log section UI** — drop the redundant `Material Item` column, render `Work Order` column as `workOrderNumber` instead of raw UUID. UI-only. Independent of any worker.
2. **Finalize worker hardening** — write before/after via the existing-FINAL running balance, allocate finalCutSequence including voided. Per [worker-descriptions/cut-logs/finalizing-cut-log-worker/description.md](worker-descriptions/cut-logs/finalizing-cut-log-worker/description.md) (TBD).
3. **Void flow** — re-audit after finalize lands. Should be mostly OK as-is.
4. **PDF generation worker** — separate task per the next-steps checklist.

---

## Approval gate

Reading this plan, do you want any of:

- A) Lock it as-is and execute.
- B) Flip something — name what.
- C) Add a regression test plan before execute.

If A, I'll execute step 1 → step 7 in one pass and write an execution log to `sessions/`.
