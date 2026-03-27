"use client"

import { type ChangeEvent, useMemo, useState } from "react"
import { useCanonicalDetailNavigation } from "@/features/dashboard/shared/navigation/use-canonical-detail-navigation"
import { confirmRecordDelete, buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { requestJson } from "@/features/flooring/shared/transport/http"

export type CategoryOption = {
  id: string
  name: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
}

export type ProductRow = {
  id: string
  name: string
  categoryId: string
  manufacturerId: string
  manufacturerName: string
  style: string
  color: string
  width: string
  sheetSize: string
  thickness: string
  unitWeight: string
  baseColor: string
  coveragePerUnit: string
  coverageUnit: string
  photoUrls: string[]
  notes: string
  createdAt: string
  updatedAt: string
  category: {
    id: string
    name: string
    sendUnit: string
    stockUnit: string
    coverageAvailableUnit: string
    itemCoverageUnit: string
  }
}

export type ProductForm = {
  categoryId: string
  manufacturerId: string
  style: string
  color: string
  baseColor: string
  width: string
  sheetSize: string
  thickness: string
  unitWeight: string
  coveragePerUnit: string
  photoUrls: string[]
  notes: string
}

export type ManufacturerOption = {
  id: string
  name: string
  website: string
  phone: string
  email: string
}

export const DEFAULT_BASE_COLOR_OPTIONS = [
  "Beige",
  "Black",
  "Blue",
  "Brown",
  "Gray",
  "Green",
  "Multi",
  "Red",
  "Tan",
  "White",
]

export const EMPTY_PRODUCT_FORM: ProductForm = {
  categoryId: "",
  manufacturerId: "",
  style: "",
  color: "",
  baseColor: "",
  width: "",
  sheetSize: "",
  thickness: "",
  unitWeight: "",
  coveragePerUnit: "",
  photoUrls: [],
  notes: "",
}

function isValidDecimal(value: string) {
  return /^\d+(\.\d{0,4})?$/.test(value.trim())
}

export function useProductsListController({
  initialProducts,
}: {
  initialProducts: ProductRow[]
}) {
  const productNavigation = useCanonicalDetailNavigation("/dashboard/flooring/products")
  const [products, setProducts] = useState(initialProducts)
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [manufacturerOptions, setManufacturerOptions] = useState<ManufacturerOption[]>([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [isLoadingFormOptions, setIsLoadingFormOptions] = useState(false)
  const [hasLoadedFormOptions, setHasLoadedFormOptions] = useState(false)
  const [newBaseColor, setNewBaseColor] = useState("")
  const [customBaseColors, setCustomBaseColors] = useState<string[]>([])
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)

  const selectedCategory = categoryOptions.find((category) => category.id === productForm.categoryId) ?? null
  const baseColorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...DEFAULT_BASE_COLOR_OPTIONS, ...customBaseColors, ...products.map((product) => product.baseColor)]
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [customBaseColors, products],
  )

  function clearNotices() {
    setMessage("")
    setError("")
  }

  async function ensureCreateOptionsLoaded() {
    if (hasLoadedFormOptions || isLoadingFormOptions) {
      return
    }

    setIsLoadingFormOptions(true)

    try {
      const payload = await requestJson<{
        categoryOptions: CategoryOption[]
        manufacturerOptions: ManufacturerOption[]
      }>("/api/flooring/products/options")
      setCategoryOptions(payload.categoryOptions)
      setManufacturerOptions(payload.manufacturerOptions)
      setHasLoadedFormOptions(true)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load product form options")
    } finally {
      setIsLoadingFormOptions(false)
    }
  }

  function openCreateProduct() {
    clearNotices()
    setProductForm(EMPTY_PRODUCT_FORM)
    setNewBaseColor("")
    setIsCreateModalOpen(true)
    void ensureCreateOptionsLoaded()
  }

  function closeCreateProduct() {
    if (isSavingProduct || isUploadingPhotos) return
    setIsCreateModalOpen(false)
  }

  function updateProductForm(field: keyof ProductForm, value: string | string[]) {
    setProductForm((previous) => ({ ...previous, [field]: value }))
  }

  async function createProduct() {
    clearNotices()

    if (!productForm.categoryId) {
      setError("Category is required")
      return
    }

    if (!hasLoadedFormOptions) {
      setError("Product form options are still loading")
      return
    }

    if (productForm.coveragePerUnit.trim() && !isValidDecimal(productForm.coveragePerUnit)) {
      setError("Coverage per unit must be numeric with up to 4 decimals")
      return
    }

    setIsSavingProduct(true)

    try {
      const payload = await requestJson<{ product: ProductRow }>("/api/flooring/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          coveragePerUnit: productForm.coveragePerUnit.trim(),
        }),
      })

      setProducts((previous) => [payload.product, ...previous].sort((left, right) => left.name.localeCompare(right.name)))
      setIsCreateModalOpen(false)
      productNavigation.openRecord(payload.product.id)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to create product")
    } finally {
      setIsSavingProduct(false)
    }
  }

  async function deleteProduct(product: ProductRow) {
    if (!confirmRecordDelete(buildDeleteConfirmationMessage(product.name || "product"))) {
      return
    }

    clearNotices()
    setDeletingProductId(product.id)

    try {
      await requestJson<{ success: boolean }>(`/api/flooring/products/${product.id}`, { method: "DELETE" })
      setProducts((previous) => previous.filter((item) => item.id !== product.id))
      setMessage("Product deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete product")
    } finally {
      setDeletingProductId(null)
    }
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    clearNotices()
    setIsUploadingPhotos(true)

    try {
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)
        const payload = await requestJson<{ url: string }>("/api/flooring/product-photos", {
          method: "POST",
          body: formData,
        })
        uploadedUrls.push(payload.url)
      }

      setProductForm((previous) => ({
        ...previous,
        photoUrls: Array.from(new Set([...previous.photoUrls, ...uploadedUrls])),
      }))
      setMessage(`${uploadedUrls.length} photo${uploadedUrls.length === 1 ? "" : "s"} uploaded`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload photos")
    } finally {
      setIsUploadingPhotos(false)
      event.target.value = ""
    }
  }

  function removePhotoUrl(url: string) {
    setProductForm((previous) => ({
      ...previous,
      photoUrls: previous.photoUrls.filter((photoUrl) => photoUrl !== url),
    }))
  }

  function addBaseColorOption() {
    const trimmed = newBaseColor.trim()
    if (!trimmed) return

    setCustomBaseColors((previous) => Array.from(new Set([...previous, trimmed])).sort((left, right) => left.localeCompare(right)))
    setProductForm((previous) => ({ ...previous, baseColor: trimmed }))
    setNewBaseColor("")
  }

  return {
    products,
    message,
    error,
    clearNotices,
    isCreateModalOpen,
    openCreateProduct,
    closeCreateProduct,
    productForm,
    updateProductForm,
    isSavingProduct,
    isUploadingPhotos,
    isLoadingFormOptions,
    createProduct,
    deletingProductId,
    deleteProduct,
    handlePhotoUpload,
    removePhotoUrl,
    selectedCategory,
    newBaseColor,
    setNewBaseColor,
    addBaseColorOption,
    baseColorOptions,
    categoryOptions,
    manufacturerOptions,
    openProductRecord: productNavigation.openRecord,
  }
}
