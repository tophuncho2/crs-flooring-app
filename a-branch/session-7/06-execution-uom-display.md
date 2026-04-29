# Execution — UoM Display polish

Standalone follow-up after the products + templates verticals landed. Surfaces unit-of-measure data that was already on the wire but not displayed.

## Files changed

### Data layer — `packages/db/src/flooring/products/`

| File | Change |
|---|---|
| `shared.ts` | `productOptionSelect` adds `sendUnitName: true`, `sendUnitAbbrev: true` |
| `read-repository.ts` | `ProductOptionRecord` adds `sendUnitName: string` + `sendUnitAbbrev: string`; `normalizeProductOption` projects them (`?? ""`) |

### Products UI — `apps/web/modules/products/components/record/product-primary-fields-section.tsx`

| Change | Detail |
|---|---|
| `formatUnit(name, abbrev)` helper | Returns `"Name (abbrev)"`, `"Name"` if no abbrev, or `"—"` if no name |
| 3 readonly cells added | `Send Unit`, `Stock Unit`, `Item Coverage Unit` — stacked in the left side-pane below Category, above Manufacturer |
| Source switching | `categoryReadOnly = true` (record view) → reads from `product.{send,stock,itemCoverage}UnitName/Abbrev` snapshot. `categoryReadOnly = false` (create) → reads from `selectedCategory.{send,stock,itemCoverage}Unit/Abbrev` (live `CategoryRecord`) |
| Existing item-coverage rail | Untouched — still appears next to Coverage Per Unit per user requirement |

### Templates UI — `apps/web/modules/templates/components/record/template-material-items-section.tsx`

| Change | Detail |
|---|---|
| `MaterialItemProductOption` extended | Adds `sendUnitName: string` + `sendUnitAbbrev: string` |
| `productById` lookup | `useMemo` Map<id, option> built once per render |
| `case "quantity"` rewritten | Flex container: `<NumberCell>` + abbrev suffix span. Suffix shows `productById.get(item.productId)?.sendUnitAbbrev` or `"—"` when no product picked yet |

## Design choices

| Choice | Rationale |
|---|---|
| Source the products section from snapshot in record view | Snapshot is point-in-time accurate — survives UoM renames after product creation |
| Source the products section from live category in create | No snapshot exists yet pre-save; live derivation populates the cells as soon as user picks a category |
| Source the templates MI quantity cell from `productOptions` (live) | Single source of truth at render time — abbrev updates instantly when user changes the row's product, even on draft rows |
| Three separate cells in products | Matches existing cell layout pattern; each unit gets a clear standalone label |
| Suffix is `aria-hidden="true"` on the templates grid | Decorative — the cell already has `ariaLabel="Material item quantity"`. Avoids screen reader double-reading. |

## Verification

| Check | Result |
|---|---|
| `@builders/db` build | ✅ exit 0 |
| `@builders/application` typecheck | ✅ exit 0 |
| `apps/web` typecheck — templates + products | ✅ 0 errors |
| Other module typecheck (work-orders, etc.) | unchanged — pre-existing |

## Reusability for WO sweep

Both new pieces will work in the WO record view + WO MI grid by:

- Reusing `MaterialItemProductOption` shape (already extended) when wiring the WO material items section component.
- Reusing the `<NumberCell> + suffix span` cell pattern in the WO MI quantity cell.
- Reusing the products primary section's `formatUnit` + 3-cell pattern if WO ever surfaces a product anywhere (it doesn't directly — items have products, not the WO itself).

No new helper, no new shape — all reusable as-is.

## Sweep position

```
✅ 1. Schema
✅ 2–5. Products vertical
✅ 6a–6d. Templates vertical
✅ 6e. UoM display polish (products + templates)   ← just landed
👉 7. Work orders module (full sweep)
   8. (Deferred) WOMI cut-log expandable row
```
