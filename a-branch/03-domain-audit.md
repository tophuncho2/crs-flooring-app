# Audit — Domain layer (Templates + Work Orders)

Snapshot of `packages/domain/src/management/templates/` and
`packages/domain/src/flooring/work-orders/` as of `058143c4`. Read alongside
`intent.md` (which has been updated with the locked domain rules for this
sweep) and `02-schema-pricing-cleanup-execution.md` (which lists the schema
deltas the domain layer now has to mirror).

## TL;DR

| Module | Files today | State | Top gap |
|---|---|---|---|
| `management/templates/` | 11 (incl. `material-items/`) | ~80% there. Strip pricing, add send-unit snapshot, surface property-instructions autofill helper. | `unitPrice` is still in types/rules/normalizers; types do not carry `sendUnitName/Abbrev`. |
| `flooring/work-orders/` | 6 (no `material-items/` subdir) | ~30% there. Material-items subdir does not exist; status field absent; no warehouse-lock rule; no file-gen payload; no template-sync helpers. | Build `material-items/` mirroring templates, add status enum union, add cut-log-blocked rules, add `queue/generate-work-order-file.ts` payload, add property-instructions autofill helper. |

**Schema deltas the domain has to absorb (already on staging — see `02-...`):**
- `FlooringTemplateItem`: `unitPrice` DROPPED; `sendUnitName?` + `sendUnitAbbrev?` ADDED.
- `FlooringWorkOrderItem`: `unitPrice`, `assignedQuantity`, `assignedCost` DROPPED; `sendUnitName?` + `sendUnitAbbrev?` ADDED.
- `FlooringWorkOrder`: `status FlooringWorkOrderStatus @default(IDLE)` ADDED; `analytics` back-ref REMOVED; `files` relation ADDED.
- `FlooringWorkOrderFile`: NEW.
- Enum `FlooringWorkOrderStatus`: NEW (`IDLE | QUEUED | WORKING | COMPLETED | FAILED`).

**Pricing references still in domain (must be removed):**

| File | Line | Reference |
|---|---|---|
| `management/templates/material-items/types.ts` | 6 | `unitPrice: string` (row) |
| `management/templates/material-items/types.ts` | 14 | `unitPrice: string` (form) |
| `management/templates/material-items/types.ts` | 21 | `unitPrice: ""` (empty form) |
| `management/templates/material-items/rules.ts` | 9–12 | `unitPrice` validator block |
| `management/templates/material-items/normalizers.ts` | 8 | `unitPrice` input duck-type |
| `management/templates/material-items/normalizers.ts` | 19 | `unitPrice: item.unitPrice.toString()` |
| `management/templates/error-messages.ts` | 7 | `TEMPLATE_MATERIAL_ITEM_UNIT_PRICE_INVALID_MESSAGE` |
| `shared/line-totals.ts` | 3, 12 | `LineTotalInput.unitPrice` + `calculateLineTotal` (this file is **out of scope** — used only by `record-summary.ts` and `record-expense-summary.ts`, neither of which is consumed by templates/WO modules; safe to leave for a later sweep) |

No `assignedQuantity` / `assignedCost` references in the domain layer — those
were UI-only.

## `management/templates/` — file-by-file

```
templates/
├── index.ts                     barrel
├── types.ts                     TemplateListRow, TemplateDetail, TemplateForm, TemplateOption
├── form-rules.ts                validateTemplateForm, toTemplateForm
├── normalizers.ts               normalizeTemplate{ListRow,, Option}
├── delete-rules.ts              isTemplateDeleteBlocked → false
├── error-messages.ts            5 message constants
└── material-items/
    ├── index.ts                 barrel
    ├── types.ts                 TemplateMaterialItemRow, …Form, EMPTY_…_FORM
    ├── rules.ts                 validateTemplateMaterialItemForm
    ├── normalizers.ts           normalizeTemplateMaterialItem
    └── diff-rules.ts            TemplateMaterialItem{Draft|Update|Delete|sDiff}
```

### Gaps vs target

| Concern | Current | Target | Notes |
|---|---|---|---|
| `unitPrice` in row/form/normalizer/rules/error | present | removed | see references table above |
| Send-unit snapshot on row | absent | `sendUnitName: string`, `sendUnitAbbrev: string` (default `""`) | mirror `InventoryRow` shape; nullable in DB but normalize to `""` for UI symmetry |
| Send-unit snapshot stamping | absent | helper `buildSendUnitSnapshotFromProduct(product) → { sendUnitName, sendUnitAbbrev }` lives next to the form rules | pure projection from `ProductRowCategory.sendUnit` (full name) + (we currently don't carry abbrev on `ProductRowCategory` — see Open Q1) |
| `propertyInstructions` autofill | absent | helper `applyPropertyInstructionsAutofill(form, property) → form` that overwrites `propertyInstructions` with the property's value on link/relink, leaving subsequent free edits untouched | called by primary-section save use case + by template-sync use case |
| Required-fields contract | only `propertyId` + `unitType` | confirm with user whether the **work-order** required-only-fields rule (warehouse + property) replaces this for templates too, or whether templates keep their existing form-rules contract | Open Q3 |
| Diff validator for material items | rules + diff types only — no `validateTemplateMaterialItemsDiff` (no `expectedUpdatedAt`, no projection) | mirror `validateCutLogsDiff` shape: project post-diff form, validate per-row, optimistic-lock per row | Application's existing `save-template-material-items-section.ts` currently re-validates per row procedurally; a domain-level diff validator gives WO MI a single pattern to clone |
| Editability partition | none | `TEMPLATE_MATERIAL_ITEM_USER_EDITABLE_FIELDS` const (e.g. `["productId", "quantity", "notes"]`) | parallel to `CUT_LOG_PENDING_USER_EDITABLE_FIELDS`; lets the diff validator reject unknown patch keys |

### Things that DO NOT need to change

- `delete-rules.ts` (`isTemplateDeleteBlocked → false`) — schema cascades + WO `templateId` SetNull cover everything; templates remain freely deletable.
- Outer `form-rules.ts` (the `propertyId`/`unitType` validator) — only required-field changes if the WO-style rule extends to templates (Open Q3).
- `TemplateOption` shape — already minimal.

## `flooring/work-orders/` — file-by-file

```
work-orders/
├── index.ts                     barrel
├── types.ts                     WorkOrderListRow, WorkOrderDetail, WorkOrderForm, WorkOrderOption
├── form-rules.ts                validateWorkOrderForm, toWorkOrderForm
├── normalizers.ts               normalizeWorkOrder{ListRow,, Option}
├── delete-rules.ts              isWorkOrderDeleteBlocked → false (signature, no inputs)
└── error-messages.ts            3 message constants
```

### Gaps vs target

| Concern | Current | Target | Notes |
|---|---|---|---|
| `material-items/` subdir | does not exist | mirror templates: `types.ts`, `rules.ts`, `normalizers.ts`, `diff-rules.ts`, `index.ts` | required-fields = product + quantity; carries `sendUnitName/Abbrev` snapshot fields and `sourceTemplateItemId: string \| null`; quantity validation matches templates |
| `status` on row/detail | absent | `status: FlooringWorkOrderStatus` on `WorkOrderListRow`/`WorkOrderDetail` | new union literal type `FlooringWorkOrderStatus = "IDLE" \| "QUEUED" \| "WORKING" \| "COMPLETED" \| "FAILED"` (mirror `FlooringCutLogStatus` pattern); NOT on the form (worker-controlled) |
| Required-fields rule | `propertyId` only | per intent: `propertyId` + `warehouseId` are the only required fields | swap `warehouseId: string` (non-empty) into `validateWorkOrderForm`, and update `EMPTY_WORK_ORDER_FORM` defaults to keep both as `""` |
| Warehouse-change lock | absent | `assertWorkOrderWarehouseChangeAllowed(input: { currentWarehouseId, nextWarehouseId, hasLinkedCutLogs }) → throws` (or `getWorkOrderWarehouseChangeBlocker → reason \| null`) | predicate the application use case calls before applying a primary-section patch |
| Delete-blocked rule | always returns `false` | `isWorkOrderDeleteBlocked({ hasLinkedCutLogs }) → boolean` + `assertWorkOrderDeleteAllowed(...)` throw variant | mirror staged-inv pattern; reason code constant for surfacing UI message |
| `templateSyncedAt` / `templateSyncMode` / `templateSnapshotHash` | not in row/detail | add as snapshot fields on `WorkOrderDetail`; not on form | exposed read-only so UI can show "synced N days ago" without a separate query |
| `propertyInstructions` autofill | not handled | shared helper consumed by primary-section save + by template-sync use case (same helper as templates) | Open Q2: probably belongs in a **shared** location consumed by both modules — propose `management/properties/instructions-autofill.ts` |
| Send-unit snapshot stamping | not handled | same helper as templates (or shared) — see `material-items/` row |
| Cut-log linkage symmetry | partial — existing `assertCutLogLinkageSymmetry` in cut-logs domain | extend the **WO** side: when material items get cut logs assigned, the cut log row gets BOTH `workOrderId` and `workOrderItemId` set — already enforced by `assertCutLogLinkageSymmetry` | ✅ no new code; just confirm the WO MI cut-log save use case calls it |
| Inventory-pick scope predicate | absent | `isInventoryEligibleForWorkOrderItem(inventory, workOrder) → boolean` — same warehouse, same product, `stockBalance > 0` | drives the expandable cut-logs row's "pick inventory" link; see intent §"Material-items expandable row" |

### Things that DO NOT need to change

- `WorkOrderOption` — already minimal.
- `vacancy` validation in `validateWorkOrderForm` — orthogonal to this sweep.
- Outbox shape — `QueueOutboxEvent` is owned by data layer; domain only contributes the topic constant + Zod payload (new file, see below).

## `queue/` — payloads to add

Existing (cut-log-side, do not change):

| File | Topic | Lock target |
|---|---|---|
| `pending-save-cut-log-batch.ts` | `flooring.cut-log.pending-save` | `inventoryId` |
| `finalize-cut-log-batch.ts` | `flooring.cut-log.finalize` | `inventoryId` |
| `void-cut-log.ts` | `flooring.cut-log.void` | `inventoryId` |

New for this sweep:

| File | Topic | Notes |
|---|---|---|
| `queue/generate-work-order-file.ts` | `flooring.work-order.file-generation.requested` | `{ version: "v1", topic, workOrderId, fileId, requestedBy, requestedAt }`. Ships `parseGenerateWorkOrderFilePayload`. Constants: `GENERATE_WORK_ORDER_FILE_TOPIC`, `…_QUEUE`, `…_JOB_NAME`. Mirror `void-cut-log.ts` shape. |

**Open question (Open Q4) — WO-MI cut-log save flow.** Per intent: "another
set will be built around the work order material items section." Two options:

1. **Reuse existing per-inventory payloads** — the WO-MI save use case fans
   out the user's diff into N per-inventory payloads (one outbox event per
   inventory row touched). Simpler, but loses "save the WOMI as a unit"
   atomicity.
2. **New WOMI-scoped payload + worker** — `flooring.work-order-item.cut-log.pending-save`
   with `workOrderItemId` as the lock target and the diff carrying
   `inventoryId` per row. Worker would need a multi-inventory lock strategy
   (sort inventory ids → take FOR UPDATE in order to avoid deadlock).

Recommendation: option 1 unless a single-WOMI-save-must-be-atomic use case
surfaces. Locks the simpler shape until proven wrong.

## `shared/` — adjacent

| File | Status | Notes |
|---|---|---|
| `shared/line-totals.ts` | Out of scope. References `unitPrice` but only consumed by `record-summary.ts` + `record-expense-summary.ts` + `inventory-summary.ts` (currency formatter), none of which are consumed by templates/WO modules. Leave for a later sweep that owns `record-summary.ts`. |
| `shared/diff-identity.ts` | Stays. WO MI `diff-rules.ts` should reuse it. |
| `shared/product-display-name.ts` | Stays. WO MI normalizer should consume it for `productName`. |
| `shared/numbering.ts` | Stays. |
| `shared/date-format.ts` | Stays. |

## File-generation HTML builder — domain placement

Per intent §"PDF contents: WO main row + material items + cut logs grouped per
material item." The domain owns the HTML string; `@builders/pdf` only renders
HTML→PDF and is forbidden from business logic.

Proposed location: `flooring/work-orders/file-generation/build-work-order-pdf-html.ts`
plus a `types.ts` describing the input shape (full WO read shape, joined
items, joined cut logs grouped per WOMI). Inputs are **read-shape** (already
normalized strings), so the builder is a pure projection — no decimal math,
no DB types.

The data layer's `getWorkOrderForFileGeneration` (sweep 4 / data layer)
returns this exact shape.

## Open questions for the user

| # | Question | Recommendation |
|---|---|---|
| Q1 | `ProductRowCategory.sendUnit` carries the full name (`"Square Feet"`) but not the abbreviation (`"sf"`). To stamp `sendUnitAbbrev` on items at write time, do we ----  extend `ProductRowCategory` with `sendUnitAbbrev`, 
| Q2 | `propertyInstructions` autofill helper — lives in `management/properties/instructions-autofill.ts`, exported from properties barrel. 
| Q3 | WO required-fields rule ("only `warehouseId` + `propertyId`") | Templates keep `propertyId` + `unitType`.
| Q4 | WO-MI cut-log save flow: fan out to existing per-inventory payloads, or new WOMI-scoped payload? | Fan out to existing — see §"Open question Open Q4" above. | **Flag q4 as an pending answer** 
| Q5 | `validateTemplateMaterialItemsDiff` — promote to a domain-level diff validator now (mirror `validateCutLogsDiff`) or leave the procedural per-row check in the application layer? | Promote. Gives WO MI a clone target and shrinks the application use case ** flag as pending answer**. |
| Q6 | Status field on the **template** row — out of scope this sweep (intent §"Template file gen dropped from this sweep")? Confirm. | Out of scope; no `status` on templates. | ----- templates do not need a status, the sync to work orders will be synchronous. 

## Files this sweep will touch (preview)

**Modify (templates):**
- `management/templates/material-items/types.ts` — drop `unitPrice`, add `sendUnitName/Abbrev`.
- `management/templates/material-items/rules.ts` — drop unit-price validator.
- `management/templates/material-items/normalizers.ts` — drop `unitPrice`, project `sendUnitName/Abbrev`.
- `management/templates/material-items/diff-rules.ts` — add `validateTemplateMaterialItemsDiff` + editable-fields const.
- `management/templates/error-messages.ts` — drop `TEMPLATE_MATERIAL_ITEM_UNIT_PRICE_INVALID_MESSAGE`.
- `management/properties/index.ts` — export new `instructions-autofill.ts`.

**Create (templates side):**
- `management/properties/instructions-autofill.ts` — shared autofill helper.

**Modify (work-orders):**
- `flooring/work-orders/types.ts` — add `status`, `templateSynced*` snapshots, `sourceTemplateItemId` plumbing on item type.
- `flooring/work-orders/form-rules.ts` — add `warehouseId` to required-fields validator.
- `flooring/work-orders/normalizers.ts` — surface `status` + sync snapshots.
- `flooring/work-orders/delete-rules.ts` — accept `{ hasLinkedCutLogs }` input, return `boolean`.
- `flooring/work-orders/error-messages.ts` — add warehouse-locked, delete-blocked, file-gen messages.
- `flooring/work-orders/index.ts` — re-export new subdir + status type.

**Create (work-orders side):**
- `flooring/work-orders/lock-rules.ts` — `assertWorkOrderWarehouseChangeAllowed`, `assertWorkOrderDeleteAllowed`.
- `flooring/work-orders/material-items/index.ts`
- `flooring/work-orders/material-items/types.ts`
- `flooring/work-orders/material-items/rules.ts`
- `flooring/work-orders/material-items/normalizers.ts`
- `flooring/work-orders/material-items/diff-rules.ts`
- `flooring/work-orders/inventory-eligibility.ts` — predicate for the cut-log expandable row's inventory picker.
- `flooring/work-orders/file-generation/types.ts` — read shape for the PDF builder.
- `flooring/work-orders/file-generation/build-work-order-pdf-html.ts` — pure HTML projection.
- `queue/generate-work-order-file.ts` — outbox/worker payload + topic constants.

**Index updates:**
- `packages/domain/src/index.ts` — add `queue/generate-work-order-file.js` re-export.

**No changes:**
- `shared/line-totals.ts`, `shared/record-summary.ts`, `shared/record-expense-summary.ts` (out-of-scope; no consumer in templates/WO).
- `flooring/inventory/cut-logs/**` (already correct shape; WO MI cut-log save use case will reuse existing payloads + predicates).

## Counts (for the chat report)

| Metric | Count |
|---|---|
| Domain files in scope today | 17 (templates 11, work-orders 6) |
| Pricing references to strip from domain | 9 lines across 3 files |
| New files to create | 12 (1 shared + 1 lock-rules + 5 WO MI + 1 inventory-eligibility + 2 file-generation + 1 queue payload + 1 templates diff-rules promotion is in-place edit not new file) |
| Files to modify | 10 |
| Open questions for user | 6 |
| TypeScript baseline | not captured (worktree has no `node_modules` and `guard:prisma` blocks `npm run typecheck` on out-of-scope import) — will surface per-file as the layer is touched |
