# Sweeps 2 + 3 — Cost/Freight Inventory Audit (bundled)

**Date:** 2026-04-30 · **Branch:** `staging` · **Plan:** [`sessions/v1-master-plan.md`](v1-master-plan.md) · **Author:** read-only audit

---

## TL;DR

| Metric | Count |
|---|---|
| Files touched (UI + controllers + data + domain) | **15** |
| Files in Sweep 2 (imports / staged inv) | 6 |
| Files in Sweep 3 (inventory + cut-log section UI cells) | 9 |
| Schema changes | 0 |
| Worker / write-repo changes | 0 (worker still writes cost/freight on inventory rows per resolved Open Q §3) |
| New files to create | 0 |
| Cut-log layer changes (drafts/controllers/use-cases) | **Deferred to Sweep 4** — Sweep 2/3 only drops UI cells from cut-log grids; data flow under those cells stays intact until Sweep 4 decommissions the inventory cut-log mutation layer |

**Bundled scope:** drop cost/freight (and `costPerUnit` + `freightPerUnit`) from every user-facing surface — staged inventory grid, imports' historical "imported rows" view, inventory list, inventory primary fields, inventory pending cut-log grid, inventory historical cut-log grid. Drop the four fields from `inventoryRowSelect` + read-repo normalization + `InventoryRow` domain type + `INVENTORY_IMMUTABLE_FIELDS` constant. Schema columns + write path + materialize worker untouched.

---

## 1. Sweep 2 — Imports / staged inventory UI

### Files to edit (6)

| File | Lines | Change |
|---|---|---|
| `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx` | 35-36 + 263-278 | Drop `cost` + `freight` column defs (35-36) and the two `case "cost"` / `case "freight"` cell branches (263-278) |
| `apps/web/modules/imports/components/record/imported-rows/import-imported-rows-section.tsx` | 16-17 + 66-72 | Drop `cost` + `freight` column defs (16-17) and the two `case "cost"` / `case "freight"` cell branches (66-72). This is the historical "imported rows" view in imports record — shows materialized inventory rows. |
| `apps/web/modules/imports/controllers/drafts.ts` | 48-49, 68-69 | Drop `cost` + `freight` from `StagedDraft` type and from `toStagedDraft` mapper |
| `apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts` | 60-61, 78-79 | Drop `cost` + `freight` from `toStagedDraftPayload` and from the diff builder |
| `apps/web/app/api/imports/_validators.ts` | 111-112, 126-127 | Drop `cost` + `freight` from `nullableStagedString` field list in added/modified validators (frontend can't send anymore + ETL doesn't go through this path) |
| `packages/application/src/flooring/imports/staged-inventory-rows/save-staged-inventory-rows.ts` | 59-60, 170-171 | Drop `cost` + `freight` from patch + draft handling in the use case |

### What stays untouched in Sweep 2
- `packages/db/src/flooring/imports/staged-inventory-rows/read-repository.ts:69-70` — read-repo still selects cost/freight (ETL writes them; materialize worker reads them)
- `packages/db/src/flooring/imports/staged-inventory-rows/write-repository.ts` — write-repo still accepts cost/freight (ETL writes via this path, not via the user-edit use case)
- `packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts:62-86` — materialize worker still reads cost/freight from staged rows and writes them (plus computed per-unit values) onto inventory rows
- `packages/db/prisma/schema.prisma:312-313` — schema columns stay

---

## 2. Sweep 3 — Inventory UI + read-repo + domain DTO

### Files to edit (9)

| File | Lines | Change |
|---|---|---|
| `apps/web/modules/inventory/components/list/inventory-client.tsx` | 52-53 | Drop `cost` + `freight` column definitions (`defaultHidden: true`, so they're already off by default — but still consume schema rows when toggled on) |
| `apps/web/modules/inventory/components/list/inventory-table.tsx` | 26-27 + 120-123 | Drop `cost` + `freight` column layout entries (26-27) and the two `case "cost"` / `case "freight"` cell branches (120-123) |
| `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` | 131, 136 | Drop the two `<StaticFieldValue>` displays for `inventory.cost` and `inventory.freight`. Audit surrounding wrapper (FieldRow / FormRow) — drop the whole row(s) if cost/freight were the only field(s). |
| `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx` | 25-26 + 228-243 | Drop `cost` + `freight` column defs (25-26) and the two `case "cost"` / `case "freight"` cell branches (228-243). PENDING cut-log grid. **User-flagged inclusion.** |
| `apps/web/modules/inventory/components/record/sections/inventory-historical-cut-logs-section.tsx` | 18-19 + 105-111 | Drop `cost` + `freight` column defs (18-19) and the two `case "cost"` / `case "freight"` cell branches (105-111). HISTORICAL (final/voided) cut-log grid. **User-flagged inclusion.** |
| `packages/db/src/flooring/inventory/shared.ts` | 58-61 | Drop the 4 lines `cost: true, freight: true, costPerUnit: true, freightPerUnit: true` from `inventoryRowSelect`. Stops fetching dead columns end-to-end. |
| `packages/db/src/flooring/inventory/read-repository.ts` | 125-128 | Drop the 4 normalizations (`toDecimalString(payload.cost)` etc) — they reference fields that won't be in the select anymore |
| `packages/domain/src/flooring/inventory/types.ts` | 48-51 | Drop the 4 fields from `InventoryRow` type (`cost: string`, `freight: string`, `costPerUnit: string`, `freightPerUnit: string`) |
| `packages/domain/src/flooring/inventory/editability.ts` | 14-17 | Drop the 4 entries from `INVENTORY_IMMUTABLE_FIELDS` constant (`"cost"`, `"freight"`, `"costPerUnit"`, `"freightPerUnit"`) — keeps the constant in lockstep with the type |

### What stays untouched in Sweep 3
- `packages/db/src/flooring/inventory/write-repository.ts:34-37, 45, 85-86, 243-246` — write-repo accepts cost/freight/costPerUnit/freightPerUnit on row creation. Worker writes them (per resolved Open Q §3). Comment at line 45 says "Immutable fields (startingStock, cost, freight, ...)" — accurate.
- `apps/web/app/api/inventory/_validators.ts:30-32` — already excludes cost/freight from inventory PATCH (comment: "intentionally NOT accepted here"). No change needed.
- `packages/db/prisma/schema.prisma:312-313` — schema columns stay
- All cut-log domain types + workers that use `cutLog.cost` / `cutLog.freight` — these are CUT LOG fields (separate from inventory row fields). Cut-log data model untouched. Only the UI display cells in the inventory record view's cut-log grids are dropped (per user direction).
- `apps/web/modules/inventory/controllers/drafts.ts:32-33, 40-41, 50-51, 93-103` — `CutLogDraft` keeps cost/freight + the validation. Sweep 4 will gut this when inventory-side cut-log mutations decommission. Touching it now would be premature work that Sweep 4 throws away.
- `apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts` — same rationale, Sweep 4 territory.

---

## 3. Cut-log section UI cells — disposition map

User flag: "if the cut logs rows in inventory section shows the cost and freight column then that can be included in the sweep as well." Both sections show them — both in scope.

| Section | File | Disposition |
|---|---|---|
| Pending cut-log grid (editable, in inventory record view) | `inventory-cut-logs-section.tsx` | Drop columns 25-26 + cells 228-243 |
| Historical cut-log grid (read-only, in inventory record view) | `inventory-historical-cut-logs-section.tsx` | Drop columns 18-19 + cells 105-111 |
| WO-side WOMI cut-log row | `apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx` | **No cost/freight cells today** — WO flow doesn't display them. Verified by grep over `apps/web/modules/work-orders/` — zero `.cost` / `.freight` references. No change. |

---

## 4. Typecheck blast-radius prediction

When `cost`, `freight`, `costPerUnit`, `freightPerUnit` come off `InventoryRow`:

- `inventory-client.tsx:52-53` — drops in same change
- `inventory-table.tsx:120-123` — drops in same change
- `inventory-primary-fields-section.tsx:131, 136` — drops in same change
- `import-imported-rows-section.tsx:68, 72` — drops in same change (the row passed to this section is materialized into an InventoryRow type — once those fields are gone, this UI breaks if not also updated)
- `INVENTORY_IMMUTABLE_FIELDS` array entries — drop to match (consumers like `isInventoryFieldImmutable("cost")` would now return false; no caller relies on that today since the API validator already rejects cost/freight in PATCH)

Expect 0 leftover errors after the surface drops.

---

## 5. Open questions

1. **Server validator + use case (Sweep 2 — `_validators.ts:111-127` + `save-staged-inventory-rows.ts:59-60, 170-171`)** — drop cost/freight from these (clean line; frontend can no longer send), or keep as defense-in-depth? **Recommend drop** — frontend can't reach the fields anymore via UI, ETL writes via a different path, and dead validator fields rot fast. **Question: confirm drop?**

2. **`INVENTORY_IMMUTABLE_FIELDS` constant (Sweep 3 — `editability.ts:14-17`)** — drop the 4 entries (cleaner — type and constant match) or keep as a "known-immutable list" for any future code that introspects field names? **Recommend drop.** **Question: confirm drop?**

3. **Bundling: one commit or two?** Per CLAUDE.md "Schema changes are always in a commit by itself" — there's no schema change here, so either pattern is allowed. The two sweeps are logically the same change (cost/freight V1 hide). **Recommend one commit** with a clear message scoping both. **Question: one commit, or split as commit-per-sweep within the bundle?**

4. **`inventory-primary-fields-section.tsx:131, 136`** — these two `<StaticFieldValue>` are inside two adjacent `<RecordPrimaryFieldCell>` rows. Need to drop the whole cell wrappers, not just the `<StaticFieldValue>` content. **Confirm: drop the entire FieldRow/FieldCell that wraps each, leaving the rest of the primary fields layout intact.** No question for the user — just flagging.

5. **Worker output verification post-sweep** — after Sweep 3, the materialize worker still writes cost/freight/costPerUnit/freightPerUnit onto inventory rows, but no UI consumes them and no read fetches them. **Suggested smoke: run an import end-to-end + confirm the import succeeds + confirm the resulting inventory rows render correctly without the cost/freight columns.** No question for the user — part of Step 4 verification.

---

## 6. Verification plan (Step 4 of the bundled execution)

- `npm run typecheck` (full repo) passes — domain + db + application + web all clean
- Manual smoke (dev server):
  1. Open imports record view → confirm staged-inventory grid has no cost/freight columns
  2. On the same record, scroll to the imported rows (historical) section → confirm same
  3. Open inventory list view → confirm cost/freight columns gone (also no longer toggleable from column visibility menu, since the column defs are gone)
  4. Open inventory record view → primary section has no cost/freight static fields; pending cut-log grid has no cost/freight columns; historical cut-log grid has no cost/freight columns
  5. Run an import end-to-end → confirm import succeeds, inventory rows materialize, render cleanly
- DB query plan check (optional): `EXPLAIN` on `getInventoryById` to confirm the four columns are no longer SELECTed

---

## 7. Suggested commit message (one combined commit)

```
inventory: drop cost/freight from V1 user surfaces (UI + reads)

Sweeps 2 + 3 from sessions/v1-master-plan.md — cost/freight isn't part of V1.
Hide it from the user end-to-end while preserving the schema + write path
for future use.

Imports / staged inventory:
- Drop cost/freight cells from the staged-inventory grid + imported-rows grid
- Drop cost/freight from StagedDraft type, diff builder, server validator,
  and save-staged-inventory-rows use case (frontend can't send anymore;
  ETL writes via a different repo path that's untouched)

Inventory:
- Drop cost/freight columns from list view + primary fields section + both
  cut-log grids (pending + historical)
- Drop cost/freight/costPerUnit/freightPerUnit from inventoryRowSelect, the
  read-repository normalization, the InventoryRow DTO, and
  INVENTORY_IMMUTABLE_FIELDS — stops fetching dead columns end-to-end
- Schema columns + write-repository + materialize worker untouched
  (worker still seeds the four columns; no V1 reader consumes them)

Inventory cut-log mutation layer (drafts, controllers, use cases) is left
intact — Sweep 4 decommissions it as part of the WOMI handover.
```

---

## 8. Things this audit did not verify

- Did not run typecheck or dev server. Blast-radius prediction (§4) is based on grep + file inspection, not test execution.
- Did not verify that `imported-rows-section` consumes a strict `InventoryRow` type vs a relaxed view shape — if it's a different shape, the typecheck blast may be smaller. Inspect at edit time.
- Did not check whether any list-view filter / sort / group reference cost or freight fields by name. (Defaults are `defaultHidden: true` so they're not in the standard filter UI.) If found, drop.
