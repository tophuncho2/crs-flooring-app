# Location Picker Package — Inventory Record View (Sweep 1 of 2)

## Context

Build the location picker package end-to-end, then apply it to the inventory record view's Location field. Imports staged-inventory rows is sweep 2. WO cut-log side panel (introduces section + inventory pickers) is out of scope.

**Search target**: "Rx-Lx" — implemented as a parser that maps user input to rafter/level filters in the Prisma where clause.

**Out of scope:**
- Imports staged-inventory rows (sweep 2)
- WO material-items cut-log side panel — introduces section + inventory pickers, separate sweep
- Inventory list view + filters
- Warehouse list/record view (legacy stack)

## Resolved decisions

| Decision | Choice |
|---|---|
| `warehouseId` on picker | Required prop. When null, picker disabled. Mirrors `TemplatePicker` requiring `propertyId`. |
| `onOptionSelected` callback | Yes — exposes picked `LocationOption` (with `locationCode`) so consumers can update adjacent UI. Mirrors `PropertyPicker` / `ProductPicker`. |
| Search format | Parse user input — `R3-L2`, `R3`, `L2`, `3-2`, `3` (matches rafter or level), `""` (all). Build Prisma where with integer matches. |
| Validator cross-check | Drop the client-side `validateInventoryForm` location-warehouse mismatch check — picker enforces by construction. Server still validates on save. |
| Cascade on warehouse change | None this sweep (matches existing behavior — today's `SelectCell` doesn't clear locationId either). |

---

## Layer-boundary contract

| Layer | New code |
| --- | --- |
| Schema | None |
| Domain | New `LocationOption {id, warehouseId, shortCode, locationCode}` in `packages/domain/src/flooring/warehouses/types.ts` |
| Data | New `searchLocationOptions({warehouseId, search?, take})` in `packages/db/src/flooring/warehouses/read-repository.ts` |
| Application | New `packages/application/src/flooring/warehouses/search-location-options.ts` + index re-export |
| API | New `apps/web/app/api/locations/_validators.ts` + `apps/web/app/api/locations/options/route.ts` (new folder). New `LOCATIONS_TOOL_SLUG = "warehouse"` in `tool-slugs.ts` + `lookup-domains.ts`. |
| Web primitives / controllers / hooks / transport | None — reused |
| Module — locations | **New** `apps/web/modules/locations/data/location-options-request.ts` + `apps/web/modules/locations/components/picker/location-picker.tsx` |
| Module — inventory | 4 file edits + 1 page edit |
| Module — warehouse / imports / shared engines | None |

---

## Reference patterns

| Concern | Reference |
|---|---|
| Picker with required scope filter + `onOptionSelected` | `apps/web/modules/properties/components/picker/property-picker.tsx` (propertyId scope), `apps/web/modules/templates/components/picker/template-picker.tsx` (disabled when scope null) |
| Search use case + DB fn | `searchProductOptions` in `packages/db/src/flooring/products/read-repository.ts` (carved from list query) |
| Snapshot pattern for live preview | `WorkOrderPrimaryFieldsSection`'s `pickedPropertyJoined` state (sweep 1 of pickers) |
| Tool slug + lookup domains add | job-types sweep — added `JOB_TYPES_TOOL_SLUG = "warehouse"` |

---

## Execution plan

### 1. Domain — `packages/domain/src/flooring/warehouses/types.ts`

Add:
```typescript
export type LocationOption = {
  id: string
  warehouseId: string
  shortCode: string  // "R{rafter}-L{level}"
  locationCode: string  // "W{n}-S{n}-R{rafter}-L{level}"
}
```

### 2. Data — `packages/db/src/flooring/warehouses/read-repository.ts`

Add `searchLocationOptions({warehouseId, search?, take}, client?) → Promise<LocationOption[]>`. Parser logic:
```typescript
function parseRafterLevelQuery(query: string): { rafter?: number; level?: number; eitherSide?: number } {
  const trimmed = query.trim()
  if (!trimmed) return {}
  // R{n}-L{n} or {n}-{n}
  const both = trimmed.match(/^R?(\d+)\s*-\s*L?(\d+)$/i)
  if (both) return { rafter: Number(both[1]), level: Number(both[2]) }
  // R{n} only
  const rafterOnly = trimmed.match(/^R(\d+)$/i)
  if (rafterOnly) return { rafter: Number(rafterOnly[1]) }
  // L{n} only
  const levelOnly = trimmed.match(/^L(\d+)$/i)
  if (levelOnly) return { level: Number(levelOnly[1]) }
  // Lone number — match either side
  const single = trimmed.match(/^(\d+)$/)
  if (single) return { eitherSide: Number(single[1]) }
  return {}
}
```

Where clause:
- Always: `warehouseId: args.warehouseId`
- Apply parsed filters (rafter/level/eitherSide) on top
- `eitherSide` → `OR: [{rafter: n}, {level: n}]`

Select includes section + warehouse joins to compute `locationCode` via `formatFullLocationCode` and `shortCode` via `formatLocationRafterLevel`. Order by `[{rafter: "asc"}, {level: "asc"}]`. Apply `take`.

### 3. Application — `packages/application/src/flooring/warehouses/search-location-options.ts`

Mirror `searchWarehouseOptionsUseCase`:
- Input: `{ warehouseId: string, search?, take? }`
- Trim search, clamp take 1–50 (default 20)
- Delegate to `searchLocationOptions`
- Re-export from package index

### 4. API

- **Tool slug** — add `LOCATIONS_TOOL_SLUG = "warehouse"` to `apps/web/modules/shared/access/tool-slugs.ts` + re-export from `lookup-domains.ts`
- **`apps/web/app/api/locations/_validators.ts`** — `validateLocationOptionsQuery(searchParams)` returning `{ warehouseId: string (required), search?: string, take: number }`. Reject missing `warehouseId` with 400.
- **`apps/web/app/api/locations/options/route.ts`** — GET only, mirrors `apps/web/app/api/templates/options/route.ts` (which has a required scope param). Calls `searchLocationOptionsUseCase`.

### 5. Module — `apps/web/modules/locations/`

- **`data/location-options-request.ts`** — `LOCATION_OPTIONS_QUERY_KEY = ["locations", "options"] as const`. `searchLocationOptionsRequest(search, signal, args: { warehouseId, take? })` calling `GET /api/locations/options?warehouseId=&search=&take=`.
- **`components/picker/location-picker.tsx`** — mirrors `TemplatePicker` (required scope, disabled when null) + `PropertyPicker`'s `onOptionSelected` pattern:
  - Props: `value`, `onChange`, `warehouseId: string | null` (required), `onOptionSelected?(option)`, `selectedLabel?`, `placeholder`, `disabled?`, etc.
  - Bucket key folds in `warehouseId` for per-scope React Query buckets.
  - Disabled when `warehouseId` is null.
  - `toDropdownOption(option) → { id, title: option.shortCode, subtitles: [option.locationCode] }`.

### 6. Inventory — apply the picker

#### 6a. `apps/web/modules/inventory/data/queries.ts`

- Drop `listInventoryOptions` import (no longer used after this sweep).
- Drop the `getInventoryDetailPageData` `Promise.all` second arg + `locationOptions` field from return type. Function becomes single-fetch (`getInventoryDetailById(id)` only).

#### 6b. `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts`

- Drop `locationOptions` param + `InventoryLocationOption` import.
- Drop derived `selectedLocation` / `availableLocationOptions` / dead `activeWarehouseName` / dead `locationScopeId`.
- In `saveSection`: drop the `selectedLocationLookup` derivation. Pass `null` for the validator's location arg (picker enforces warehouse match by construction; server validator catches stale-after-warehouse-change cases).
- Return signature shrinks to just the controller's base + nothing extra.

#### 6c. `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx`

- Drop `locationOptions` + `selectedLocation` props.
- Add `locationCode: string | null` + `locationShortCode: string | null` props.
- Import `LocationPicker`.
- Local state: `const [pickedLocation, setPickedLocation] = useState<LocationOption | null>(null)`. Effect on `inventory.locationId` resets it.
- Compute display: `displayLocationCode = pickedLocation?.locationCode ?? locationCode`; `displayLocationShortCode = pickedLocation?.shortCode ?? locationShortCode`.
- Row 1 "Full Location" cell: `<StaticFieldValue>{displayLocationCode || "-"}</StaticFieldValue>`.
- Row 2 Location cell: `editable && Boolean(draft.warehouseId) ? <LocationPicker warehouseId={draft.warehouseId || null} value={draft.locationId || null} onChange={(id) => onFieldChange("locationId", id ?? "")} onOptionSelected={setPickedLocation} selectedLabel={displayLocationShortCode || null} placeholder="Select Location" ariaLabel="Location" /> : <StaticFieldValue>{displayLocationShortCode || "—"}</StaticFieldValue>`.
- Drop dead `locationPlaceholder` derivation.

#### 6d. `apps/web/modules/inventory/components/record/inventory-record-panel.tsx`

- Drop `locationOptions` prop + `InventoryLocationOption` import.
- Drop `controller.availableLocationOptions` / `controller.selectedLocation` references (they no longer exist).
- Pass `locationCode={controller.record.locationCode}` + `locationShortCode={controller.record.locationShortCode}` to section.
- Stop passing `locationOptions` to `useInventoryPrimarySection({...})`.

#### 6e. `apps/web/modules/inventory/components/record/inventory-detail-client.tsx`

- Drop `locationOptions` prop + `InventoryLocationOption` import + panel forwarding.

#### 6f. `apps/web/app/dashboard/inventory/[id]/page.tsx`

- Stop forwarding `result.data.locationOptions`.

---

## Verification

1. `npm run build --workspace @builders/{domain,db,application}` — clean per layer.
2. `npm run typecheck --workspace @builders/web` — clean.
3. `npm run build --workspace @builders/web` (Railway's step) — succeeds.
4. UI smoke: open an inventory record. Read-only mode shows the joined location code. Edit mode opens picker (disabled until warehouse picked). Type "R3-L2" → exact match. Type "R3" → all level variants. Type "3" → matches either side. Pick a location → "Full Location" cell live-updates with the picked location's full code. Save → round-trips. Change warehouse → picker results swap to new warehouse's locations.

---

## Files touched (~14)

**New (7):** see Layer-boundary table above.

**Modified (~7):**
- `packages/domain/src/flooring/warehouses/types.ts`
- `packages/db/src/flooring/warehouses/read-repository.ts`
- `packages/application/src/flooring/warehouses/index.ts`
- `apps/web/modules/shared/access/tool-slugs.ts` + `lookup-domains.ts`
- `apps/web/modules/inventory/data/queries.ts`
- `apps/web/modules/inventory/controllers/use-inventory-primary-section.ts`
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx`
- `apps/web/modules/inventory/components/record/inventory-record-panel.tsx`
- `apps/web/modules/inventory/components/record/inventory-detail-client.tsx`
- `apps/web/app/dashboard/inventory/[id]/page.tsx`

---

## Open questions

None.

---

## Follow-up sweeps (out of scope)

- **Sweep 2 — imports staged-inventory rows**: per-row LocationPicker scoped to the parent import's warehouseId. Drop locationOptions from `getImportFormOptions`.
- **Sweep 3 (separate) — WO cut-log side panel**: introduces SectionPicker (filters LocationPicker, which filters InventorySelect). Different pattern (3 cascading pickers), not a follow-up to this package.
