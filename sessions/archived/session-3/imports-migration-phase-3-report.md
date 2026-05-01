# Imports Migration — Phase 3 Execution Report

Date: 2026-04-25
Plan: [docs/imports-migration-revised-plan.md](imports-migration-revised-plan.md)
Branch: staging
Scope: Migrate the primary fields section of the imports record view off the engine field-grid and onto `FieldSection` + cell primitives.

---

## What changed

### [`apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx`](apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx)

Full body rewrite. Same component prop signature (`draft`, `warehouseOptions`, `manufacturerOptions`, `disabled`, `onFieldChange`) — both consumers (detail panel + create client) consume it unchanged.

**Layout** — single `FieldSection` (8-col invisible `LayoutGrid`):
- Row 1: Order Number (col 1, span 2), Tag (col 3, span 2), Warehouse (col 5, span 2), Manufacturer (col 7, span 2)
- Row 2: Notes (col 1, span 8) — full-width

**Cell mapping:**
| Field | Cell | Notes |
|---|---|---|
| Order Number | `TextCell` | passthrough |
| Tag | `TextCell` | passthrough |
| Warehouse | `SelectCell` with `required` `FormField` | maps `WarehouseOption {id, name}` → `SelectOption {value, label}` inline |
| Manufacturer | `DropdownCell` with `allowClear` | `ManufacturerOption {id, label}` matches `DropdownOption` shape directly; converts empty string ↔ `null` for the cell's nullable contract |
| Notes | `TextareaCell` (Phase 1 primitive) | `rows={3}`, multi-line; replaces the engine's `RECORD_TEXTAREA_CONTROL_CLASS_NAME` |

**Editability:** drives off `disabled` prop unchanged (`editable = !disabled`). When the controller's `isSaving` is true the section disables; same as before.

### Engine imports dropped from this file

All of:
- `RECORD_FIELD_CONTROL_CLASS_NAME`
- `RECORD_TEXTAREA_CONTROL_CLASS_NAME`
- `RecordFormField`
- `RecordPrimaryFieldCell`
- `RecordPrimaryFieldsGrid`
- `RecordPrimaryPane`
- `RecordPrimarySection`

(All sourced from `@/modules/shared/engines/record-view`.)

### Engine surfaces preserved (untouched)

The component is wrapped — at consumer level — by `RecordPrimarySectionInstance` ([import-record-panel.tsx:64](apps/web/modules/imports/components/record/import-record-panel.tsx)) for the detail flow and `RecordSingleSectionPanel` ([import-create-client.tsx](apps/web/modules/imports/components/record/import-create-client.tsx)) for the create flow. Those wrappers provide:
- Title bar
- Save / Discard buttons
- Saving label
- Conflict banner
- Notice surface (positive `noticeMessage` + `noticeError`)
- Dirty-state coordination across sections

Per the revised plan, all of that is **explicitly out of scope** for this sweep — they live in the §1.3 "stays" list and stay imported from the engine until a later migration. Phase 3 only touches the inner field grid.

The `useImportPrimarySection` controller is also untouched — validation (`validateImportPrimaryForm`), save (`updateImportRequest`), delete (`deleteImportRequest`), and dirty-slate machinery all continue to drive from the engine wrapper.

---

## Verification

### Engine imports grep — primary fields section

```sh
grep -rn "@/modules/shared/engines/record-view" \
  apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx
```

Result: **zero matches.** Plan acceptance hit ("Drop all `from \"@/modules/shared/engines/record-view\"` imports from this file").

### Typecheck

```
cd apps/web && npx tsc --noEmit | wc -l
→ 67 (identical to baseline)
```

Filtered:
```
... | grep "modules/imports/components/record/sections/import-primary"
→ 0
```

The detail panel ([import-record-panel.tsx:78](apps/web/modules/imports/components/record/import-record-panel.tsx)) and create client ([import-create-client.tsx](apps/web/modules/imports/components/record/import-create-client.tsx)) both type-check clean — the section's prop signature is unchanged so neither consumer needs edits.

### Tests

| | Test files | Tests |
|---|---|---|
| Phase 2 end | 9 failed / 37 passed (46) | 18 failed / 165 passed (183) |
| **After Phase 3** | **9 failed / 37 passed (46)** | **18 failed / 165 passed (183)** |

Identical. No regressions; no new tests added (Phase 3 doesn't get its own test rewrite — the detail flow's test coverage is deferred to a later sweep, consistent with the Phase 2 plan note that detail/create tests were stale and removed).

---

## Files touched

- [`apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx`](apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx) — full body rewrite (107 → 71 LOC)

---

## Phase 3 acceptance status

- [x] Single `FieldSection` replaces the 2-pane `RecordPrimarySection` + `RecordPrimaryPane` × 2 + `RecordPrimaryFieldsGrid` chrome
- [x] All five fields wired to the correct cell kinds (Order Number / Tag → TextCell; Warehouse → SelectCell required; Manufacturer → DropdownCell allowClear; Notes → TextareaCell)
- [x] All `from "@/modules/shared/engines/record-view"` imports dropped from this file
- [x] Save / discard / dirty-state continues to drive from `useImportPrimarySection` (controller untouched, wrapper untouched)
- [x] Create flow consumes the same file unchanged (typecheck verifies prop compatibility)
- [x] No regressions vs. baseline (typecheck + test counts identical)

**Phase 3 complete.** Phase 4 (staged inventory rows section + mark-for-import additive) is unblocked when you are. Recommend a quick browser smoke on `/dashboard/imports/{id}` before moving on — the field-section visual is a real change (single 8-col flex layout vs. left/right pane split), and runtime save/edit behavior is best confirmed in-browser.
