"use client"

import { DebouncedSearchControl } from "@/engines/list-view"
import type { ProductSearchKey } from "@builders/domain"

/**
 * The four product-attribute search bars (PROD-#, color, style, naming addon)
 * shared by every list whose rows link to a product — the Products list itself
 * and the linked-table lists (inventory, adjustments, inventory-indicators). The
 * product NAME bar is intentionally NOT here: the linked tables carry a product
 * picker filter, and Products renders its own `q`→name `SearchControl` alongside
 * this component.
 *
 * Values are the current (raw) filter strings keyed by {@link PRODUCT_SEARCH_KEYS};
 * `onChange` commits a trimmed value per key. `subject` only shapes the aria copy.
 */
type ProductSearchControlsProps = {
  values: Partial<Record<ProductSearchKey, string>>
  onChange: (key: ProductSearchKey, value: string) => void
  subject: string
}

const PRODUCT_SEARCH_BARS: ReadonlyArray<{
  key: ProductSearchKey
  placeholder: string
  aria: string
}> = [
  { key: "prodNumber", placeholder: "PROD #", aria: "product number" },
  { key: "color", placeholder: "Color", aria: "product color" },
  { key: "style", placeholder: "Style", aria: "product style" },
  { key: "namingAddon", placeholder: "Naming addon", aria: "product naming addon" },
]

export function ProductSearchControls({ values, onChange, subject }: ProductSearchControlsProps) {
  return (
    <>
      {PRODUCT_SEARCH_BARS.map((bar) => (
        <DebouncedSearchControl
          key={bar.key}
          value={values[bar.key] ?? ""}
          onCommit={(next) => onChange(bar.key, next)}
          placeholder={bar.placeholder}
          ariaLabel={`Search ${subject} by ${bar.aria}`}
        />
      ))}
    </>
  )
}
