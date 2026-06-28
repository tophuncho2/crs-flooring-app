"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { validateStagedInventoryForm, type CategoryOption, type ProductOption } from "@builders/domain"
import {
  useAsyncRichDropdownController,
  type AsyncRichDropdownControllerOutput,
} from "@/engines/picker"
import {
  CATEGORY_OPTIONS_QUERY_KEY,
  searchCategoryOptionsRequest,
} from "@/modules/categories/data/category-options-request"
import {
  PRODUCT_OPTIONS_QUERY_KEY,
  searchProductOptionsRequest,
} from "@/modules/products/data/product-options-request"
import type {
  StagedRowFormValues,
  StagedRowProductSeed,
} from "@/modules/imports/controllers/record/drafts"

const EMPTY_FORM: StagedRowFormValues = {
  rollNumber: "",
  startingStock: "",
  dyeLot: "",
  location: "",
  note: "",
}

const ATTRIBUTE_DEBOUNCE_MS = 250

export type AddStagedInventoryModalController = {
  // Product-find stage
  categoryId: string | null
  categoryLabel: string | null
  selectCategory: (id: string, label: string) => void
  clearCategory: () => void
  categoryController: AsyncRichDropdownControllerOutput<CategoryOption>
  style: string
  color: string
  namingAddon: string
  setStyle: (value: string) => void
  setColor: (value: string) => void
  setNamingAddon: (value: string) => void
  productController: AsyncRichDropdownControllerOutput<ProductOption>
  // Form stage
  pickedProduct: ProductOption | null
  pickProduct: (option: ProductOption) => void
  changeProduct: () => void
  form: StagedRowFormValues
  setFormField: (field: keyof StagedRowFormValues, value: string) => void
  // Commit
  canCreate: boolean
  submit: () => void
}

/**
 * State for the section-level "Add Staged Inventory" create modal. Drives a
 * product-find table (category filter + style/color/naming attribute bars over
 * the product-options endpoint) and, once a product is picked, the staged-row
 * form fields. Cost + freight are never collected — the seeded draft defaults
 * them empty. On submit it appends one fully-populated DRAFT (via `onAdd`) and
 * closes; the section's batch Save persists it through the OCC seam.
 */
export function useAddStagedInventoryModal({
  enabled,
  onAdd,
  onClose,
}: {
  enabled: boolean
  onAdd: (seed: StagedRowProductSeed, form: StagedRowFormValues) => void
  onClose: () => void
}): AddStagedInventoryModalController {
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null)
  const [style, setStyle] = useState("")
  const [color, setColor] = useState("")
  const [namingAddon, setNamingAddon] = useState("")
  const [pickedProduct, setPickedProduct] = useState<ProductOption | null>(null)
  const [form, setForm] = useState<StagedRowFormValues>(EMPTY_FORM)

  // Debounce the free-text attribute bars before they drive the product query so
  // each keystroke doesn't fire a request.
  const [debounced, setDebounced] = useState({ style: "", color: "", namingAddon: "" })
  useEffect(() => {
    const id = setTimeout(
      () =>
        setDebounced({ style: style.trim(), color: color.trim(), namingAddon: namingAddon.trim() }),
      ATTRIBUTE_DEBOUNCE_MS,
    )
    return () => clearTimeout(id)
  }, [style, color, namingAddon])

  const categoryController = useAsyncRichDropdownController<CategoryOption>({
    bucketKey: CATEGORY_OPTIONS_QUERY_KEY,
    pagedSearchFn: searchCategoryOptionsRequest,
    enabled,
  })

  // The product table is driven entirely by the category + attribute filters
  // (not the controller's own query string), so they ride in the bucket key.
  const productBucketKey = useMemo(
    () =>
      [
        ...PRODUCT_OPTIONS_QUERY_KEY,
        "staged-modal",
        categoryId ?? null,
        debounced.style,
        debounced.color,
        debounced.namingAddon,
      ] as const,
    [categoryId, debounced],
  )
  const productSearchFn = useCallback(
    (_search: string, signal: AbortSignal | undefined, skip: number) =>
      searchProductOptionsRequest("", signal, {
        categoryId: categoryId ?? undefined,
        style: debounced.style || undefined,
        color: debounced.color || undefined,
        namingAddon: debounced.namingAddon || undefined,
        skip,
      }),
    [categoryId, debounced],
  )
  const productController = useAsyncRichDropdownController<ProductOption>({
    bucketKey: productBucketKey,
    pagedSearchFn: productSearchFn,
    enabled,
  })

  const selectCategory = useCallback((id: string, label: string) => {
    setCategoryId(id)
    setCategoryLabel(label)
  }, [])
  const clearCategory = useCallback(() => {
    setCategoryId(null)
    setCategoryLabel(null)
  }, [])

  const pickProduct = useCallback((option: ProductOption) => setPickedProduct(option), [])
  const changeProduct = useCallback(() => setPickedProduct(null), [])
  const setFormField = useCallback(
    (field: keyof StagedRowFormValues, value: string) =>
      setForm((prev) => ({ ...prev, [field]: value })),
    [],
  )

  const canCreate = useMemo(() => {
    if (!pickedProduct) return false
    return validateStagedInventoryForm({ ...form, cost: "", freight: "" }).length === 0
  }, [pickedProduct, form])

  const submit = useCallback(() => {
    if (!pickedProduct) return
    onAdd(
      {
        productId: pickedProduct.id,
        productName: pickedProduct.name,
        stockUnitAbbrev: pickedProduct.stockUnitAbbrev,
      },
      form,
    )
    onClose()
  }, [pickedProduct, form, onAdd, onClose])

  return {
    categoryId,
    categoryLabel,
    selectCategory,
    clearCategory,
    categoryController,
    style,
    color,
    namingAddon,
    setStyle,
    setColor,
    setNamingAddon,
    productController,
    pickedProduct,
    pickProduct,
    changeProduct,
    form,
    setFormField,
    canCreate,
    submit,
  }
}
