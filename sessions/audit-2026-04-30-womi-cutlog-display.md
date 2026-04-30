# Audit — WOMI cut-log display gap (sweep-4c regression)

**Date:** 2026-04-30
**Companion:** [audit-2026-04-30-womi-cutlog-worker.md](audit-2026-04-30-womi-cutlog-worker.md) — the worker locker bug. This audit is **second in the same flow**: with the locker fixed, the save now persists, but the saved row never appears in the WOMI section.
**Symptom:** "Saving a pending cut worked BUT that cut disappeared from the WOMI cut log items, only shows in the inv rows cut log section."

---

## TL;DR

**The worker is innocent.** The cut log persists with both linkage columns set (`workOrderId` + `workOrderItemId`). The inventory-side section sees it because the inventory record loader includes `cutLogs` directly on the inventory record. The WO-side section can't see it because **its loader never fetches cut logs at all** — and the panel hardcodes an empty placeholder map.

The smoking gun is one line in [work-order-record-panel.tsx:36](apps/web/modules/work-orders/components/record/work-order-record-panel.tsx:36):

```ts
const cutLogsByWorkOrderItemId: Record<string, PendingCutLogRow[]> = {}
```

The comment above it claims the per-WOMI controller fetches its own state on expand. **That controller was retired in sweep 4c.** [use-work-order-item-pending-cut-logs.ts:7-13](apps/web/modules/work-orders/controllers/use-work-order-item-pending-cut-logs.ts:7) self-documents the retirement. The file is now type-only; no fetch happens anywhere. The empty `{}` flows to `WorkOrderMaterialItemsSection` → `cutLogs = cutLogsByWorkOrderItemId[row.id] ?? []` → empty render every time.

---

## Headlines (errors observed: 0 · functional gap: 1)

| # | Severity | Summary | Where |
|---|---|---|---|
| 1 | 🔴 Blocker | WO record loader never fetches cut logs; panel passes hardcoded `{}` to WOMI section | [work-order-record-panel.tsx:32-36](apps/web/modules/work-orders/components/record/work-order-record-panel.tsx:32) + [data/queries.ts:105-138](apps/web/modules/work-orders/data/queries.ts:105) |
| 2 | 🟡 Gap | `listCutLogsForWorkOrderItem` exists in db package but has zero call sites — dead code shipped at the same time as the regression | [packages/db/src/.../cut-logs/read-repository.ts:30](packages/db/src/flooring/work-orders/cut-logs/read-repository.ts:30) |
| 3 | 🟡 Gap | No GET route under `…/material-items/[itemId]/pending-cut-logs/` — even if a lazy-fetch hook existed there's nowhere to fetch from | `apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/` |
| 4 | 🟢 Minor | Stale comment in `work-order-record-panel.tsx:32-35` references a controller that no longer exists | same file |
| 5 | 🟢 Minor | Type-only re-export file `use-work-order-item-pending-cut-logs.ts` exists for back-compat — flagged for post-V1 cleanup in its own docstring | [apps/web/modules/work-orders/controllers/use-work-order-item-pending-cut-logs.ts](apps/web/modules/work-orders/controllers/use-work-order-item-pending-cut-logs.ts) |

---

## Why the inventory side works (and the WO side doesn't)

| | Inventory record | WO record |
|---|---|---|
| Loader file | [apps/web/modules/inventory/data/queries.ts](apps/web/modules/inventory/data/queries.ts) | [apps/web/modules/work-orders/data/queries.ts:105](apps/web/modules/work-orders/data/queries.ts:105) |
| Cut logs in initial data? | ✅ `controller.record.cutLogs` (loader bundles them onto the record) | ❌ Not fetched |
| Panel access pattern | `controller.record.cutLogs` ([inventory-record-panel.tsx:44](apps/web/modules/inventory/components/record/inventory-record-panel.tsx:44)) | `cutLogsByWorkOrderItemId = {}` literal ([work-order-record-panel.tsx:36](apps/web/modules/work-orders/components/record/work-order-record-panel.tsx:36)) |
| Render result | Real rows | Always empty |

---

## Locked plan — Option 1 (SSR hydrate)

Mirror the inventory pattern: have the WO loader fetch + group + normalize cut logs, pass through props, kill the empty placeholder.

### Files to change

| # | Layer | File | Change |
|---|---|---|---|
| 1 | Domain | **CREATE** `packages/domain/src/flooring/work-orders/cut-logs/types.ts` | New `WorkOrderItemPendingCutLogRow` type — UI projection mirroring the existing `PendingCutLogRow` shape |
| 2 | Domain | **CREATE** `packages/domain/src/flooring/work-orders/cut-logs/normalizers.ts` | New `normalizeWorkOrderItemPendingCutLogRow` — Decimal → string, Date → ISO, null `coverageCut` → "" |
| 3 | Domain | **CREATE** `packages/domain/src/flooring/work-orders/cut-logs/index.ts` | Barrel |
| 4 | Domain | **EDIT** `packages/domain/src/flooring/work-orders/index.ts` | Re-export the new sub-barrel |
| 5 | Data | **EDIT** `packages/db/src/flooring/work-orders/cut-logs/read-repository.ts` | New `listCutLogsForWorkOrderItemIds(ids: string[])` — single grouped query, ordered `[isFinal asc, finalCutSequence asc, createdAt asc]` to match the existing single-WOMI reader's ordering |
| 6 | App data | **EDIT** `apps/web/modules/work-orders/data/queries.ts` | Extend `getWorkOrderDetailPageData`: parallel-fetch the new reader, group + normalize, add `cutLogsByWorkOrderItemId` to `WorkOrderDetailPageData` |
| 7 | Page | **EDIT** `apps/web/app/dashboard/work-orders/[id]/page.tsx` | Forward new prop |
| 8 | Client | **EDIT** `apps/web/modules/work-orders/components/record/work-order-detail-client.tsx` | Accept + forward |
| 9 | Panel | **EDIT** `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx` | Accept prop, delete the `= {}` placeholder + stale comment |
| 10 | Module | **DELETE** `apps/web/modules/work-orders/controllers/use-work-order-item-pending-cut-logs.ts` | Replace its type re-export with a direct `@builders/domain` import in the 3 consumers |
| 11 | Module | **EDIT** 3 consumers (panel, section, row) | Update `import type { PendingCutLogRow }` → `import type { WorkOrderItemPendingCutLogRow as PendingCutLogRow }` (or rename in place) |

### Why this shape

- **Mirrors inventory.** Same lifecycle (record-shaped initial data fetched in the loader), so the pattern is already familiar in the codebase.
- **One round-trip.** A single `findMany` with `where: { workOrderItemId: { in: ids } }` covers the whole page. For typical V1 WOs (handful of WOMIs, handful of cuts each) this is well under 50 rows.
- **No new API surface.** Avoids inventing a GET route just to support the SSR initial-load. (A future Option-2 lazy-fetch can layer on top later if the page grows.)
- **Domain owns the shape.** Per locked decision #2, the normalizer goes next to `normalizeWorkOrderMaterialItem` — same package, parallel sibling dir under `work-orders/cut-logs/`.
- **No back-compat shim.** Per CLAUDE.md "no backwards-compatibility hacks", the deprecated `use-work-order-item-pending-cut-logs.ts` type-only file gets deleted, not re-exported. Three consumers update.

### What stays out of scope

- 🟡 #3 (no GET route) — Option 2 territory. Not needed for SSR hydrate.
- The `assertCutLogLinkageSymmetry` per-loop call (audit #5 in the worker audit) — separate concern.
- The silent `markFailed` swallow (worker audit #4) — separate concern.

---

## Verification plan

| Check | How |
|---|---|
| Typecheck | `npm run typecheck` over db, domain, application, web |
| Build | `npm run build --workspace @builders/domain` then `@builders/db` so dist is current |
| Runtime | Save a pending cut from the WOMI section, refresh the WO record, confirm the row appears. Then save a second cut, refresh, confirm both appear. Then expand the inventory record for the same inventory and confirm the same rows appear there too. |

---

## Open questions

None — Option 1, normalizer in domain, fresh files all confirmed by user. Executing.
