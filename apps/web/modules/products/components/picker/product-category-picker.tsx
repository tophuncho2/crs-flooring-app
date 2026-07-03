"use client"

import { useCallback, useMemo, useState } from "react"
import type { CategoryOption, ProductOption } from "@builders/domain"
import { AnchoredPanel } from "@/engines/common"
import {
  PickerList,
  PickerTrigger,
  useAsyncRichDropdownController,
  type PickerListOption,
} from "@/engines/picker"
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
  /**
   * When true, picking a product reflects that product's category in the
   * category trigger (the category is derived from the product — work orders,
   * templates). When false the trigger only ever shows the explicitly chosen
   * filter category (imports' persisted, lock-after-create filter).
   */
  showProductCategory?: boolean
  productPlaceholder?: string
  ariaLabel?: string
}

function toCategoryOption(option: CategoryOption): PickerListOption {
  return { id: option.id, title: option.name }
}

function toProductOption(option: ProductOption): PickerListOption {
  return {
    id: option.id,
    title: option.name,
    subtitles: option.unitAbbrev ? [option.unitAbbrev] : [],
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
  showProductCategory = false,
  productPlaceholder = "Select product",
  ariaLabel = "Product",
}: ProductCategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [activePicker, setActivePicker] = useState<ActivePicker>("product")
  // The active picker portals its search input into this header slot so the
  // search bar stays pinned above the scrolling option list.
  const [searchSlot, setSearchSlot] = useState<HTMLDivElement | null>(null)
  // Name shown on the category trigger after an in-panel interaction. The
  // category trigger only carries a label (no options-list fallback), so we
  // remember the picked category's name — or, when the category is derived from
  // the product, the picked product's category name. Falls back to the
  // `categoryLabel` prop (server-resolved name for already-saved rows).
  const [pickedCategoryName, setPickedCategoryName] = useState<string | null>(null)
  const categoryDisplayLabel = pickedCategoryName ?? categoryLabel

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
    (option: PickerListOption) => {
      // Changing to a different category clears the selected product — a
      // product from the old category can't stay selected once the row is
      // scoped to a new one. (Clearing the filter to "All" keeps it, since
      // every product matches "All".)
      if (option.id !== categoryId) {
        onProductChange(null)
        onProductOptionSelected?.(null)
      }
      onCategoryChange(option.id)
      setPickedCategoryName(option.title)
      setActivePicker("product")
    },
    [categoryId, onCategoryChange, onProductChange, onProductOptionSelected],
  )
  const handleCategoryClear = useCallback(() => {
    onCategoryChange(null)
    setPickedCategoryName(null)
    setActivePicker("product")
  }, [onCategoryChange])

  const handleProductSelect = useCallback(
    (_option: PickerListOption, raw: ProductOption) => {
      onProductChange(raw.id)
      onProductOptionSelected?.(raw)
      if (showProductCategory) setPickedCategoryName(raw.categoryName)
      setOpen(false)
    },
    [onProductChange, onProductOptionSelected, showProductCategory],
  )
  const handleProductClear = useCallback(() => {
    onProductChange(null)
    onProductOptionSelected?.(null)
    if (showProductCategory) setPickedCategoryName(null)
  }, [onProductChange, onProductOptionSelected, showProductCategory])

  const stickyHeader = (
    <div className="flex flex-col gap-2">
      <PickerTrigger
        expanded={activePicker === "category"}
        onToggle={() => setActivePicker("category")}
        selectedLabel={categoryDisplayLabel}
        placeholder="All categories"
        disabled={!categoryEditable}
        ariaLabel="Category filter"
      />
      <PickerTrigger
        expanded={activePicker === "product"}
        onToggle={() => setActivePicker("product")}
        selectedLabel={productLabel}
        placeholder={productPlaceholder}
        disabled={!productEditable}
        ariaLabel="Product"
      />
      <div ref={setSearchSlot} />
    </div>
  )

  const trigger = (
    <PickerTrigger
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
      {/* Mount the list only once the header search slot exists, so the search
          input portals straight into the sticky header (never flashing inline). */}
      {searchSlot === null ? null : activePicker === "category" ? (
        <PickerList<CategoryOption>
          controller={categoryController}
          toOption={toCategoryOption}
          selectedId={categoryId}
          selectedLabel={categoryDisplayLabel}
          onSelect={handleCategorySelect}
          onClear={handleCategoryClear}
          onCancel={closePanel}
          searchPlaceholder="Search categories"
          searchPortalTarget={searchSlot}
        />
      ) : (
        <PickerList<ProductOption>
          controller={productController}
          toOption={toProductOption}
          selectedId={productId}
          selectedLabel={productLabel}
          onSelect={handleProductSelect}
          onClear={handleProductClear}
          onCancel={closePanel}
          searchPlaceholder="Search products"
          searchPortalTarget={searchSlot}
        />
      )}
    </AnchoredPanel>
  )
}
