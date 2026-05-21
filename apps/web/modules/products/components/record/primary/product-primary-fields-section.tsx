"use client"

import { useMemo } from "react"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import { categoryRequiresCoveragePerUnit, type ProductCreateForm } from "@builders/domain"
import { ProductDetailsGroup } from "./groups/product-details-group"
import { ProductUnitsGroup } from "./groups/product-units-group"

/**
 * Composer for the products primary section. Renders two visual
 * groups in order — Details, Units — each with a tab-style header
 * matching the inventory / WO / template record view. The `draft` /
 * `onFieldChange` contract is unchanged from the prior 1/4 + 3/4
 * pane composition.
 */
export function ProductPrimaryFieldsSection({
  product,
  draft,
  categoryOptions,
  manufacturerName,
  disabled,
  categoryReadOnly = false,
  onFieldChange,
}: {
  product: ProductRecord
  draft: ProductCreateForm
  categoryOptions: CategoryRecord[]
  /**
   * Pre-resolved label for the saved `manufacturerId`, sourced from
   * `product.manufacturerName` (joined snapshot). Empty string on create
   * mode — the picker still works, just renders no trigger label until
   * the user picks one.
   */
  manufacturerName: string | null
  disabled: boolean
  // When true, render the category cell as a static text display sourced from
  // `product.category`. Use on the record view — category is immutable
  // post-create and the lock is enforced at the type system, validator, and
  // domain-rule layers; the UI mirrors that here.
  categoryReadOnly?: boolean
  onFieldChange: (field: keyof ProductCreateForm, value: string) => void
}) {
  const selectedCategory = useMemo(() => {
    if (categoryReadOnly) {
      return (
        categoryOptions.find((category) => category.id === product.category.id) ?? null
      )
    }
    return categoryOptions.find((category) => category.id === draft.categoryId) ?? null
  }, [categoryOptions, categoryReadOnly, draft.categoryId, product.category.id])
  const coverageRequired = categoryRequiresCoveragePerUnit(selectedCategory?.slug)

  return (
    <div className="flex flex-col gap-4">
      <ProductDetailsGroup
        product={product}
        draft={draft}
        categoryOptions={categoryOptions}
        manufacturerName={manufacturerName}
        selectedCategory={selectedCategory}
        coverageRequired={coverageRequired}
        disabled={disabled}
        categoryReadOnly={categoryReadOnly}
        onFieldChange={onFieldChange}
      />
      <ProductUnitsGroup
        product={product}
        selectedCategory={selectedCategory}
        categoryReadOnly={categoryReadOnly}
      />
    </div>
  )
}
