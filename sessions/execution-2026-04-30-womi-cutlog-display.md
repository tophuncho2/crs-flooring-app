# Execution — WOMI cut-log display fix (Option 1: SSR hydrate)

**Date:** 2026-04-30
**Audit:** [audit-2026-04-30-womi-cutlog-display.md](audit-2026-04-30-womi-cutlog-display.md)
**Companion:** [execution-2026-04-30-womi-cutlog-worker.md](execution-2026-04-30-womi-cutlog-worker.md) — locker fix landed earlier today; this execution covers the read-side gap that surfaced after the locker started working.
**Approach:** Option 1 — load cut logs in the WO record SSR loader, normalize in the domain layer, hand `cutLogsByWorkOrderItemId` through props to the panel. Mirrors how the inventory record loader already bundles cut logs.

---

## What changed

**11 changes across 4 layers. No back-compat shims (deprecated controller file deleted outright).**

### Domain — new sub-barrel `flooring/work-orders/cut-logs/`

| File | Action | Purpose |
|---|---|---|
| [packages/domain/src/flooring/work-orders/cut-logs/types.ts](packages/domain/src/flooring/work-orders/cut-logs/types.ts) | **CREATE** | `WorkOrderItemPendingCutLogRow` — UI-shaped projection (drops `cost`/`freight`/`createdAt`/`void`/linkage; pins `coverageCut: string`) |
| [packages/domain/src/flooring/work-orders/cut-logs/normalizers.ts](packages/domain/src/flooring/work-orders/cut-logs/normalizers.ts) | **CREATE** | `normalizeWorkOrderItemPendingCutLogRow` — Decimal → string via `.toString()`, Date → ISO via `.toISOString()`, null `coverageCut` → "", null `notes` → "" |
| [packages/domain/src/flooring/work-orders/cut-logs/index.ts](packages/domain/src/flooring/work-orders/cut-logs/index.ts) | **CREATE** | Barrel |
| [packages/domain/src/flooring/work-orders/index.ts](packages/domain/src/flooring/work-orders/index.ts) | **EDIT** | Re-export the new sub-barrel between `material-items` and `file-generation` |

### Data — bulk reader

| File | Action | Purpose |
|---|---|---|
| [packages/db/src/flooring/work-orders/cut-logs/read-repository.ts](packages/db/src/flooring/work-orders/cut-logs/read-repository.ts) | **EDIT** | Add `listCutLogsForWorkOrderItemIds(ids: string[])` — single `findMany` over `workOrderItemId IN (…)` with the same select + ordering as the existing single-WOMI reader. Empty-array short-circuit. |

### App data — loader

| File | Action | Purpose |
|---|---|---|
| [apps/web/modules/work-orders/data/queries.ts](apps/web/modules/work-orders/data/queries.ts) | **EDIT** | Import the new reader + normalizer + type. Add `cutLogsByWorkOrderItemId` to `WorkOrderDetailPageData`. After the parallel `Promise.all` resolves, sequentially call the bulk reader against the materialized WOMI ids and group + normalize into a `Record<string, WorkOrderItemPendingCutLogRow[]>` (every WOMI gets a bucket, even if empty). |

### App page → client → panel

| File | Action | Purpose |
|---|---|---|
| [apps/web/app/dashboard/work-orders/\[id\]/page.tsx](apps/web/app/dashboard/work-orders/[id]/page.tsx) | **EDIT** | Forward `initialCutLogsByWorkOrderItemId` from loader result → client |
| [apps/web/modules/work-orders/components/record/work-order-detail-client.tsx](apps/web/modules/work-orders/components/record/work-order-detail-client.tsx) | **EDIT** | Accept + forward to panel |
| [apps/web/modules/work-orders/components/record/work-order-record-panel.tsx](apps/web/modules/work-orders/components/record/work-order-record-panel.tsx) | **EDIT** | Accept prop, **delete the `= {}` placeholder + the stale 4-line comment** referencing the retired controller |

### Module — kill the deprecated controller, swap imports

| File | Action | Purpose |
|---|---|---|
| ~~`apps/web/modules/work-orders/controllers/use-work-order-item-pending-cut-logs.ts`~~ | **DELETE** | Type-only stub from sweep 4c — its sole export `PendingCutLogRow` is now superseded by `WorkOrderItemPendingCutLogRow` from `@builders/domain` |
| [apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx) | **EDIT** | Import `WorkOrderItemPendingCutLogRow as PendingCutLogRow` from `@builders/domain` (alias preserves the local symbol name → no body changes) |
| [apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx) | **EDIT** | Same alias swap |

---

## What this resolves

| Audit item | Status |
|---|---|
| 🔴 #1 — Empty `cutLogsByWorkOrderItemId` placeholder | ✅ Fixed — now sourced from SSR |
| 🟡 #2 — `listCutLogsForWorkOrderItem` had zero call sites | 🟢 Note: still has zero call sites. The bulk variant is what the loader uses; the single-WOMI helper remains for ad-hoc/future use. Not deleted to avoid scope creep, but flagging for cleanup. |
| 🟡 #3 — No GET route for WOMI cut logs | ⏳ Not addressed — Option 1 doesn't need one. If lazy-fetch-on-expand becomes desirable post-V1, the route + hook can layer on top without disturbing this SSR path. |
| 🟢 #4 — Stale comment in panel | ✅ Removed |
| 🟢 #5 — Deprecated type-only file | ✅ Deleted, three consumers updated |

**Sweep-4c regression closed.** The save flow (locker fix from earlier today) and the read flow (this fix) are now both functional, and the `4c → 4d` transition no longer leaves cut logs invisible in the WO record view.

---

## Verification

| Check | Result |
|---|---|
| `npm run build --workspace @builders/domain` | ✅ clean |
| `npm run build --workspace @builders/db` (incl. `prisma generate`) | ✅ clean |
| `npm run typecheck` (root — covers `lib`, `db`, `pdf`, `application`, `web`, `relay`, `worker`, plus Next.js typegen) | ✅ all 8 packages clean |
| Deletion of deprecated file leaves no dangling imports | ✅ confirmed by full-repo typecheck pass |

**Runtime verification (deferred — needs you to drive the UI):** save a pending cut from the WOMI section, refresh the WO record, confirm the row shows in the WOMI section. Also expand the inventory record for the same inventory and confirm the same row is still visible there. After 4d's worker is restarted to pick up `@builders/db` rebuild, both views should see the same persisted cut.

---

## Behavioral notes

- **One extra read per WO record page load.** A single `findMany` over `workOrderItemId IN (...)`. For typical V1 WOs (handful of WOMIs, handful of cuts each) this is well under 50 rows and runs after the parallel `Promise.all` (so it doesn't block the other initial loads — they finish first, then we batch-fetch cut logs once we have the WOMI ids).
  - **Could be parallelized** by reading WOMI ids first via a lighter query, then `Promise.all`-ing alongside everything else. Skipped for now — V1 page loads aren't measurable hotspots; revisit if perf budget tightens.
- **Empty buckets pre-seeded.** Every WOMI gets a `[]` entry in the map even if it has no cut logs. The panel reads `cutLogsByWorkOrderItemId[row.id] ?? []`, so this is defensive symmetry rather than required correctness.
- **`workOrderItemId === null` rows are skipped.** A cut log with linkage drift (shouldn't happen — `assertCutLogLinkageSymmetry` guards the producer) is silently dropped from the WOMI map. It still shows up under inventory.
- **No client-side state migration.** The `useWorkOrderCutLogSectionState` hook still owns dirty cut-log state. After save it clears local state and the next record refresh seeds from the SSR snapshot — same flow as before; the snapshot just isn't empty anymore.

---

## Open follow-ups (not addressed here)

1. **Delete `listCutLogsForWorkOrderItem`** if confirmed unused after a sweep — the bulk variant covers both the bulk and single cases (`listCutLogsForWorkOrderItemIds([id])`). Holding off to keep this fix surgical.
2. **Live refresh after save** — today the user must navigate or refresh to see the saved cut. Could mutate `cutLogsByWorkOrderItemId` in `useWorkOrderCutLogSectionState.onSuccess` by re-fetching, or pass a setter pair through props (parallels how `setMaterialItems` is wired). Logged for the next pass through this section.
3. **Lazy-fetch-on-expand (Option 2)** — only worth doing if WO records grow large enough that the SSR cost becomes measurable. Not a V1 concern.
4. **Worker restart needed** — running `dev:worker` is using the pre-fix `@builders/db` dist. Restart to pick up both today's fixes (locker + new bulk reader).

---

## Commit message (do not commit yet)

```
work-orders: hydrate WOMI cut-log section from SSR

Fix a sweep-4c regression where the WO record's WOMI cut-log section
always rendered empty even after the worker successfully persisted a
pending cut. The panel was passing a hardcoded `{}` placeholder to the
section ("the cut-log expandable row controller fetches its own state
on expand" — but that controller was retired in 4c with no replacement).

Mirror the inventory record's pattern: the SSR loader now bundles cut
logs onto the page data and the panel forwards them through props.

Domain (new sub-barrel `flooring/work-orders/cut-logs/`):
- `WorkOrderItemPendingCutLogRow` — UI projection
- `normalizeWorkOrderItemPendingCutLogRow` — Decimal → string,
  Date → ISO, null → "" coercions next to `normalizeWorkOrderMaterialItem`

Data:
- `listCutLogsForWorkOrderItemIds(ids: string[])` — bulk variant of
  the existing single-WOMI reader, same select + ordering, single
  `findMany` over `workOrderItemId IN (…)`

App:
- `getWorkOrderDetailPageData` calls the bulk reader, groups +
  normalizes into `Record<workOrderItemId, WorkOrderItemPendingCutLogRow[]>`,
  pre-seeds empty buckets per WOMI
- Page → client → panel forward `initialCutLogsByWorkOrderItemId`
- Panel deletes the `= {}` placeholder and the stale 4-line comment

Cleanup (no back-compat shim per CLAUDE.md):
- Delete the type-only `use-work-order-item-pending-cut-logs.ts` left
  behind by sweep 4c
- Three consumers (panel, section, row) import the domain type as
  `WorkOrderItemPendingCutLogRow as PendingCutLogRow` to preserve the
  local symbol name without body churn

End-to-end: save a pending cut, refresh, the row appears in both the
WOMI section and the inventory section. Single round-trip added per
record page load.

Audit: sessions/audit-2026-04-30-womi-cutlog-display.md
Execution: sessions/execution-2026-04-30-womi-cutlog-display.md
```
