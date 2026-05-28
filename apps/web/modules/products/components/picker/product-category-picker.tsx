"use client"

import { useCallback, useMemo, useState } from "react"
import type { CategoryOption, ProductOption } from "@builders/domain"
import { AnchoredPanel } from "@/components/dropdowns/anchored-panel"
import {
  HubSidePanelPicker,
  HubSidePanelPickerTrigger,
  type HubSidePanelPickerOption,
} from "@/components/hub-side-panel"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  CATEGORY_OPTIONS_QUERY_KEY,
  searchCategoryOptionsRequest,
} from "@/modules/categories/data/category-options-request"
import {
  PRODUCT_OPTIONS_QUERY_KEY,
  searchProductOptionsRequest,
} from "@/modules/products/data/product-options-request"

type ActivePicker = "product" | "category"

export type ProductCategoryPickerProps = {
  /** Selected product id (the cell's value). */
  productId: string | null
  /** Pre-resolved product name for the trigger label. */
  productLabel: string | null
  onProductChange: (id: string | null) => void
  /**
   * Fired alongside `onProductChange` with the full picked option (or null on
   * clear), so callers can snapshot the product's joined fields (units, etc.)
   * before save. Only fires when the option is in the picker's current results.
   */
  onProductOptionSelected?: (option: ProductOption | null) => void
  /** Category filter id — narrows the product options. */
  categoryId: string | null
  /** Pre-resolved category name for the category trigger label. */
  categoryLabel?: string | null
  onCategoryChange: (id: string | null) => void
  /** Defaults true. When false the product trigger is disabled. */
  productEditable?: boolean
  /** Defaults true. When false the category trigger is disabled. */
  categoryEditable?: boolean
  productPlaceholder?: string
  ariaLabel?: string
}

function toCategoryOption(option: CategoryOption): HubSidePanelPickerOption {
  return { id: option.id, title: option.name, subtitles: [option.slug] }
}

function toProductOption(option: ProductOption): HubSidePanelPickerOption {
  return {
    id: option.id,
    title: option.name,
    subtitles: option.sendUnitAbbrev ? [option.sendUnitAbbrev] : [],
  }
}

/**
 * Combined product+category cell. The trigger shows the selected product; on
 * open it anchors an inline panel (see {@link AnchoredPanel}) whose sticky
 * header carries a category trigger and a product trigger, and whose body shows
 * the active trigger's options.
 *
 * Body defaults to the product list on open; the category list appears only
 * when the category trigger is clicked. Picking a category narrows the product
 * list and returns the body to product (panel stays open). Picking a product
 * commits and closes the panel.
 *
 * Reuses the existing category/product options endpoints and `categoryId`
 * filtering — same data path as the standalone `CategoryPicker`/`ProductPicker`.
 * Option fetches are gated on the panel being open, so closed rows don't fetch.
 */
export function ProductCategoryPicker({
  productId,
  productLabel,
  onProductChange,
  onProductOptionSelected,
  categoryId,
  categoryLabel = null,
  onCategoryChange,
  productEditable = true,
  categoryEditable = true,
  productPlaceholder = "Select product",
  ariaLabel = "Product",
}: ProductCategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [activePicker, setActivePicker] = useState<ActivePicker>("product")

  const categoryController = useAsyncRichDropdownController<CategoryOption>({
    bucketKey: CATEGORY_OPTIONS_QUERY_KEY,
    pagedSearchFn: searchCategoryOptionsRequest,
    enabled: open && activePicker === "category",
  })

  const productBucketKey = useMemo(
    () => [...PRODUCT_OPTIONS_QUERY_KEY, categoryId ?? null] as const,
    [categoryId],
  )
  const productSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchProductOptionsRequest(search, signal, {
        categoryId: categoryId ?? undefined,
        skip,
      }),
    [categoryId],
  )
  const productController = useAsyncRichDropdownController<ProductOption>({
    bucketKey: productBucketKey,
    pagedSearchFn: productSearchFn,
    enabled: open,
  })

  const openPanel = useCallback(() => {
    setActivePicker("product")
    setOpen(true)
  }, [])
  const closePanel = useCallback(() => setOpen(false), [])

  const handleCategorySelect = useCallback(
    (option: HubSidePanelPickerOption) => {
      onCategoryChange(option.id)
      setActivePicker("product")
    },
    [onCategoryChange],
  )
  const handleCategoryClear = useCallback(() => {
    onCategoryChange(null)
    setActivePicker("product")
  }, [onCategoryChange])

  const handleProductSelect = useCallback(
    (_option: HubSidePanelPickerOption, raw: ProductOption) => {
      onProductChange(raw.id)
      onProductOptionSelected?.(raw)
      setOpen(false)
    },
    [onProductChange, onProductOptionSelected],
  )
  const handleProductClear = useCallback(() => {
    onProductChange(null)
    onProductOptionSelected?.(null)
  }, [onProductChange, onProductOptionSelected])

  const stickyHeader = (
    <div className="flex flex-col gap-2">
      <HubSidePanelPickerTrigger
        expanded={activePicker === "category"}
        onToggle={() => setActivePicker("category")}
        selectedLabel={categoryLabel}
        placeholder="All categories"
        disabled={!categoryEditable}
        ariaLabel="Category filter"
      />
      <HubSidePanelPickerTrigger
        expanded={activePicker === "product"}
        onToggle={() => setActivePicker("product")}
        selectedLabel={productLabel}
        placeholder={productPlaceholder}
        disabled={!productEditable}
        ariaLabel="Product"
      />
    </div>
  )

  const trigger = (
    <HubSidePanelPickerTrigger
      expanded={open}
      onToggle={() => (open ? closePanel() : openPanel())}
      selectedLabel={productLabel}
      placeholder={productPlaceholder}
      disabled={!productEditable && !categoryEditable}
      ariaLabel={ariaLabel}
    />
  )

  return (
    <AnchoredPanel trigger={trigger} open={open} onClose={closePanel} stickyHeader={stickyHeader}>
      {activePicker === "category" ? (
        <HubSidePanelPicker<CategoryOption>
          controller={categoryController}
          toOption={toCategoryOption}
          selectedId={categoryId}
          selectedLabel={categoryLabel}
          onSelect={handleCategorySelect}
          onClear={handleCategoryClear}
          onCancel={closePanel}
          searchPlaceholder="Search categories"
        />
      ) : (
        <HubSidePanelPicker<ProductOption>
          controller={productController}
          toOption={toProductOption}
          selectedId={productId}
          selectedLabel={productLabel}
          onSelect={handleProductSelect}
          onClear={handleProductClear}
          onCancel={closePanel}
          searchPlaceholder="Search products"
        />
      )}
    </AnchoredPanel>
  )
}
