# Pre-flight — Sweep 3 foundation

**Purpose.** Before any Sweep-3 work begins, verify the Sweep-2 foundation is still intact AND apply two additive hardening rules that Sweep 3 depends on. Read-only verification for items 1–6; items 7–8 may require small code changes if Sweep 2 didn't already cover them.

Run this checklist in order. Any drift or missing coverage: fix in place → rebuild affected packages → re-check → proceed to Phase 1.

---

## Sweep-2 verification (read-only)


### 4. Inventory record edit gates
- `inventory-primary-fields-section.tsx` — `isReadOnly = !inventory.isImported`; inputs disabled; banner when read-only.
- `inventory-record-panel.tsx` — footer omits `onDelete` when read-only.
- `update-inventory.ts` — refuses updates via `INVENTORY_PENDING_IMPORT` when `current.isImported === false`.
- `inventory-cut-logs-section.tsx` — empty-state swap when pending.

### 5. Warehouse required on inventory primary
- Domain `validateInventoryInput` pushes `WAREHOUSE_REQUIRED` when `warehouseId` missing.
- `getInventoryDetailPageData` returns `warehouseOptions`; page forwards it.
- Primary section renders `<select required>` for warehouse.

### 6. Warehouse auto-link on import-diff added rows
- `applyImportInventoryRowsDiff` has `?? input.importWarehouseId` fallback on both branches.

---

## Sweep-3 hardening (apply if missing)



---

## Exit condition

All eight sections green. Any gap discovered in items 7 or 8 is a discrete commit (or two) before Phase 1 of the sweep begins.

Expected wall-clock:
- Items 1–6: ~15 min read-through if nothing regressed.
- Item 7: 30–60 min if any of the cost/freight gates are missing (route validator + UI change + domain rule + use-case check).
- Item 8: 5 min verification; longer only if a gap exists.

---

## Pending flags and concerns

None at this time. Items 7 and 8 above are the Sweep-3 hardening additions to the original Sweep-2 verification; all resolved decisions have been folded into the checklist rather than left as open flags.

If new preflight-scoped concerns surface during execution (e.g., a sixth Sweep-2 gate regressed since it last shipped), append here before moving to Phase 1.
