// Pure projection from a category's unit-of-measure relations to the six
// snapshot fields stamped onto a product row at write time.
//
// Mirrors the inventory snapshot pattern in
// packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts
// (lines 64–76). Reads NEVER traverse `product → category → unit_of_measure`
// once these snapshots are populated — the data layer selects the flat columns
// off `flooring_product` directly.
//
// Input is duck-typed: any shape with `sendUnit / stockUnit / itemCoverageUnit`
// each `{ name, abbreviation } | null`. The application layer fetches the
// category with these relations and passes it in.

export type ProductUnitSnapshot = {
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
}

type CategoryUnitInput = {
  sendUnit: { name: string; abbreviation: string } | null
  stockUnit: { name: string; abbreviation: string } | null
  itemCoverageUnit: { name: string; abbreviation: string } | null
}

export function buildProductUnitSnapshotsFromCategory(
  category: CategoryUnitInput,
): ProductUnitSnapshot {
  return {
    sendUnitName: category.sendUnit?.name ?? null,
    sendUnitAbbrev: category.sendUnit?.abbreviation ?? null,
    stockUnitName: category.stockUnit?.name ?? null,
    stockUnitAbbrev: category.stockUnit?.abbreviation ?? null,
    itemCoverageUnitName: category.itemCoverageUnit?.name ?? null,
    itemCoverageUnitAbbrev: category.itemCoverageUnit?.abbreviation ?? null,
  }
}
