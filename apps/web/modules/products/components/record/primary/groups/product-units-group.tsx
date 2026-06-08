"use client"

import { StaticFieldValue } from "@/engines/record-view"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import { ProductField } from "./product-field"
import { ProductGroup } from "./product-group"

function formatUnit(name: string | null | undefined, abbrev: string | null | undefined) {
  if (!name) return "—"
  return abbrev ? `${name} (${abbrev})` : name
}

/**
 * Group 2: Units. Read-only snapshots of the three UoMs derived from
 * the category. On the record view (`categoryReadOnly`), the displays
 * are sourced from the immutable snapshot stamped on the product row
 * at create — accurate even if a UoM was renamed afterwards. In create
 * mode they come live from the currently-selected category so the
 * cells populate as soon as the user picks one. Laid out as a 3-col
 * single row: Stock Unit / Send Unit / Item Coverage Unit.
 */
export function ProductUnitsGroup({
  product,
  selectedCategory,
  categoryReadOnly,
}: {
  product: ProductRecord
  selectedCategory: CategoryRecord | null
  categoryReadOnly: boolean
}) {
  const stockUnitDisplay = categoryReadOnly
    ? formatUnit(product.stockUnitName, product.stockUnitAbbrev)
    : formatUnit(selectedCategory?.stockUnit, selectedCategory?.stockUnitAbbrev)
  const sendUnitDisplay = categoryReadOnly
    ? formatUnit(product.sendUnitName, product.sendUnitAbbrev)
    : formatUnit(selectedCategory?.sendUnit, selectedCategory?.sendUnitAbbrev)
  const itemCoverageUnitDisplay = categoryReadOnly
    ? formatUnit(product.itemCoverageUnitName, product.itemCoverageUnitAbbrev)
    : formatUnit(selectedCategory?.itemCoverageUnit, selectedCategory?.itemCoverageUnitAbbrev)

  return (
    <ProductGroup title="Units">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ProductField label="Stock Unit">
          <StaticFieldValue>{stockUnitDisplay}</StaticFieldValue>
        </ProductField>
        <ProductField label="Send Unit">
          <StaticFieldValue>{sendUnitDisplay}</StaticFieldValue>
        </ProductField>
        <ProductField label="Item Coverage Unit">
          <StaticFieldValue>{itemCoverageUnitDisplay}</StaticFieldValue>
        </ProductField>
      </div>
    </ProductGroup>
  )
}
