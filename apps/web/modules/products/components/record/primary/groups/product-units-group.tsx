"use client"

import { PerUnitCell, StaticFieldValue } from "@/engines/record-view"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import type { ProductCreateForm } from "@builders/domain"
import { ProductField } from "./product-field"
import { ProductGroup } from "./product-group"

function formatUnit(name: string | null | undefined, abbrev: string | null | undefined) {
  if (!name) return "—"
  return abbrev ? `${name} (${abbrev})` : name
}

/**
 * Group 2: Units. Read-only snapshots of the UoMs derived from
 * the category. On the record view (`categoryReadOnly`), the displays
 * are sourced from the immutable snapshot stamped on the product row
 * at create — accurate even if a UoM was renamed afterwards. In create
 * mode they come live from the currently-selected category so the
 * cells populate as soon as the user picks one. Laid out as a 2-col
 * single row: Stock Unit / Send Unit.
 *
 * Coverage per unit is an editable, mutable reference value (create AND
 * record view). Its "/ unit" suffix is the stock-unit abbreviation —
 * live from the selected category on create, the frozen product snapshot
 * on the record view — so the unit travels with the cell.
 */
export function ProductUnitsGroup({
  product,
  draft,
  selectedCategory,
  categoryReadOnly,
  disabled,
  onFieldChange,
}: {
  product: ProductRecord
  draft: ProductCreateForm
  selectedCategory: CategoryRecord | null
  categoryReadOnly: boolean
  disabled: boolean
  onFieldChange: (field: keyof ProductCreateForm, value: string) => void
}) {
  const stockUnitDisplay = categoryReadOnly
    ? formatUnit(product.stockUnitName, product.stockUnitAbbrev)
    : formatUnit(selectedCategory?.stockUnit, selectedCategory?.stockUnitAbbrev)
  const sendUnitDisplay = categoryReadOnly
    ? formatUnit(product.sendUnitName, product.sendUnitAbbrev)
    : formatUnit(selectedCategory?.sendUnit, selectedCategory?.sendUnitAbbrev)

  const coverageUnitAbbrev = categoryReadOnly
    ? product.stockUnitAbbrev
    : selectedCategory?.stockUnitAbbrev ?? ""

  return (
    <ProductGroup title="Units">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProductField label="Stock Unit">
          <StaticFieldValue>{stockUnitDisplay}</StaticFieldValue>
        </ProductField>
        <ProductField label="Send Unit">
          <StaticFieldValue>{sendUnitDisplay}</StaticFieldValue>
        </ProductField>
        <ProductField label="Coverage / Unit">
          <PerUnitCell
            editable={!disabled}
            value={draft.coveragePerUnit}
            onChange={(value) => onFieldChange("coveragePerUnit", value)}
            unit={coverageUnitAbbrev}
            currencyPrefix=""
            ariaLabel="Coverage per unit"
          />
        </ProductField>
      </div>
    </ProductGroup>
  )
}
