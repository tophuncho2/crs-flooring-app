# Intent — WOMI Cut-Log Expandable Row (DEFERRED)

Status: **OUT OF SCOPE** for the current sweep. Parked here until the WOMI section's own diff-save (the material-items table itself) is shipped and stable. The cut-log expandable row sits **inside** that section — its controllers and use cases come after the section diff-save is secure.

## What's in scope (current sweep) vs what's deferred (this file)

| | In scope (current sweep, WO phase) | Deferred (this file) |
|---|---|---|
| WOMI domain (`flooring/work-orders/material-items/`) — types, rules, normalizers, diff-rules | ✅ | |
| WOMI data layer — read + write repos, bulk write for diff-apply | ✅ | |
| WOMI application — `save-work-order-material-items-section` use case (diff-apply + send-unit snapshot stamping) | ✅ | |
| WOMI API — `apps/web/app/api/work-orders/[id]/material-items/section/route.ts` PATCH | ✅ | |
| WOMI module-dir — section component + controller | ✅ | |
| **Cut-log expandable row** — UI toggling read-only ↔ edit mode | | ✅ |
| Cut-log expandable row controllers (add/edit/delete pending, finalize batch, void) | | ✅ |
| Cut-log expandable row application use cases | | ✅ |
| `inventory-eligibility.ts` predicate + data-layer eligible-inventory query | | ✅ |
| Decision on Q4 (WO-MI cut-log save: fan-out vs WOMI-scoped payload) | | ✅ |

The WOMI section diff-save validator does enforce one cut-log-aware rule even in the current sweep: **a row cannot be deleted if any non-void cut log links to it**. That's a per-row delete-lock parallel to the WO-level delete-lock. The check is a domain predicate over `hasLinkedCutLogs` (data layer hands the boolean per row); no expandable-row UI required for the rule itself.

## Why deferred

The cut-log expandable row introduces mechanics that don't have a template-side analogue: edit-mode toggle, batch finalize selection, multi-inventory diff under a single WOMI, eligible-inventory picker. Designing those in the abstract ahead of a working WOMI section is wasted effort — easier to design once the section is concrete and we can see the row interactions live.

## In scope when this resumes

### Cut-log domain — reuse, no new rules

All required predicates already live in `flooring/inventory/cut-logs/`:
- `isCutLogPendingEditable`, `isCutLogQueued`, `canDeleteCutLog`, `canVoidCutLog`, `canEditCutLogLinks`
- `getCutLogFinalizabilityBlocker`, `canFinalizeCutLog`
- `assertCutLogLinkageSymmetry` — every cut log linked from a WO carries BOTH `workOrderId` AND `workOrderItemId`. Never one without the other. WOMI section is the sole writer of these two columns going forward.
- `validateCutLogsDiff`, `validateCutLogFinalizeBatch`, `buildVoidedCutLogPatch`
- The inventory-side `updateLinks` use case is dropped — confirmed.

### Inventory eligibility predicate

`flooring/work-orders/inventory-eligibility.ts`:

```ts
isInventoryEligibleForWorkOrderItem(inventory, workOrder, workOrderItem) → boolean
```

True iff:
- `inventory.warehouseId === workOrder.warehouseId`
- `inventory.productId === workOrderItem.productId`
- `Number(inventory.startingStock) - Number(inventory.totalCutSum) > 0`

Drives the "pick inventory" link in the expandable row's add-pending-cut control. Pure predicate. Data layer pre-filters via the same conditions for the option-list query.

### Application use cases (mirror inventory side, scope to WO context)

The inventory record view already has these — clone the shape, scope by WOMI:
- `saveWorkOrderItemPendingCutLogsSection` — diff-apply (pending cuts add/edit/delete) under the WOMI's scope.
- `finalizeWorkOrderItemCutLogBatch` — batch-select pending → finalize.
- (Optional) `voidWorkOrderItemCutLog` — same op available from inventory record view; lean toward NOT duplicating to keep the surface small.

Every save uses `assertCutLogLinkageSymmetry` to stamp BOTH link columns atomically.

### Module dir — controllers + components

- Edit-mode toggle on the expandable row.
- Add-pending-cut control with eligible-inventory picker.
- Inline edit cells (cut, cost, freight, isWaste, notes) gated by `isCutLogPendingEditable`.
- Batch-select checkbox column for finalize.
- Surface in-flight (status === "QUEUED") rows as read-only with a spinner.

## Open questions for when this resumes

| # | Question |
|---|---|
| Q4 | WO-MI cut-log save flow: (1) fan out to existing per-inventory `pending-save-cut-log-batch` payloads (one outbox event per inventory touched in the diff), or (2) new WOMI-scoped payload + worker (`flooring.work-order-item.cut-log.pending-save`) that takes multi-inventory FOR UPDATE locks in deterministic order? Recommendation pending the live UX — fan-out unless the UX needs single-WOMI atomicity. |
| F | Does WO file generation block on this section being finished? PDF needs cut logs grouped per WOMI, so the PDF builder can't fully render until the section is wired. Three options: (a) defer file-gen entirely until this section lands; (b) ship file-gen now with a stub PDF (primary + items only, no cut logs); (c) ship file-gen now reading existing cut logs from the inventory-side flow (table already has links, even if WOMI section can't yet write them). |
| C | Multi-WOMI cut-log impact on `totalCutSum`: today the cut-log domain assumes per-inventory locking. If a single user save edits cut logs across N inventories under one WOMI, ordering of the FOR UPDATE locks across those N inventories must be deterministic to avoid deadlock. (Resolved automatically if Q4 lands on fan-out.) |
| V | Voiding cuts from the WOMI section vs from inventory — duplicate path? Lean toward dropping the WOMI-side void to keep the surface small; inventory record view stays the only place to void. |

## Resume checklist

When picking this back up:

1. Confirm WOMI section diff-save is shipped and stable (no flapping bugs, integration tests green against the per-row delete-lock).
2. Re-read inventory-side cut-log section (`apps/web/modules/inventory/...` cut-logs) as the clone target — same op set, scoped to WOMI instead of inventory.
3. Resolve open questions Q4, F, C, V above.
4. Promote this intent to a real plan under `a-branch/work-order-material-items/plan/` (mirror `a-branch/templates-plan/` shape).
5. Apply layer-by-layer: domain (`inventory-eligibility.ts`) → data (eligible-inventory query) → application (save / finalize use cases) → API (sectional routes under the WOMI) → modules (expandable row component + controller).

## Related

- `a-branch/intent.md` — current sweep intent (templates-focused, then WO module).
- `a-branch/03-domain-audit.md` — domain audit; includes the cut-log content that's now deferred. Audit stays as a snapshot.
- `a-branch/templates-plan/schema.md` — the product UoM snapshot schema plan that lands first.
