"use client"

import { type ChangeEvent, useEffect, useMemo, useState } from "react"
import { Upload, X } from "lucide-react"
import { RecordDetailPageShell } from "@/features/flooring/shared/ui/record-page/record-detail-page-shell"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordFormField as FormField } from "@/features/flooring/shared/ui/forms/record-form"
import { RecordPanelFooter } from "@/features/flooring/shared/ui/forms/record-panel-footer"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { useRecordPageController } from "@/features/flooring/shared/controllers/record-page/use-record-page-controller"
import { ProductInventoryRowsSection } from "./product-inventory-rows-section"

type CategoryOption = {
  id: string
  name: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
}

type ProductRow = {
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

type ProductForm = {
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

type ManufacturerOption = {
  id: string
  name: string
  website: string
  phone: string
  email: string
}

type InventoryRow = {
  id: string
  importEntryId: string
  importWarehouseId: string
  importNumber: string
  importTag: string
  importStatus: string
  importTransportType: string
  importWarehouseName: string
  productId: string
  productName: string
  stockUnit: string
  itemNumber: string
  dyeLot: string
  locationId: string
  locationCode: string
  warehouseId: string
  warehouseName: string
  sectionName: string
  stockCount: string
  cutTotal: string
  runningBalance: string
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
  cutLogs: Array<unknown>
}

const DEFAULT_BASE_COLOR_OPTIONS = [
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

function toProductForm(product: ProductRow): ProductForm {
  return {
    categoryId: product.categoryId,
    manufacturerId: product.manufacturerId,
    style: product.style,
    color: product.color,
    baseColor: product.baseColor,
    width: product.width,
    sheetSize: product.sheetSize,
    thickness: product.thickness,
    unitWeight: product.unitWeight,
    coveragePerUnit: product.coveragePerUnit,
    photoUrls: product.photoUrls,
    notes: product.notes,
  }
}

function isValidDecimal(value: string) {
  return /^\d+(\.\d{0,4})?$/.test(value.trim())
}

export function ProductDetailClient({
  initialProduct,
  categoryOptions,
  manufacturerOptions,
  inventoryRows,
  backHref,
}: {
  initialProduct: ProductRow
  categoryOptions: CategoryOption[]
  manufacturerOptions: ManufacturerOption[]
  inventoryRows: InventoryRow[]
  backHref: string
}) {
  const { closePage, notices, redirectToBack, setIsDirty } = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved product changes. Leave this product without saving?",
  })
  const [product, setProduct] = useState(initialProduct)
  const [productForm, setProductForm] = useState<ProductForm>(toProductForm(initialProduct))
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [newBaseColor, setNewBaseColor] = useState("")
  const [customBaseColors, setCustomBaseColors] = useState<string[]>([])

  const categories = categoryOptions
  const selectedCategory = categories.find((category) => category.id === productForm.categoryId) ?? null
  const isDirty = useMemo(() => JSON.stringify(productForm) !== JSON.stringify(toProductForm(product)), [product, productForm])
  const baseColorOptions = Array.from(
    new Set(
      [...DEFAULT_BASE_COLOR_OPTIONS, ...customBaseColors, product.baseColor]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b))

  useEffect(() => {
    setIsDirty(isDirty)
  }, [isDirty, setIsDirty])

  async function saveProduct() {
    notices.clearNotices()
    if (!productForm.categoryId) {
      notices.showError("Category is required")
      return
    }
    if (productForm.coveragePerUnit.trim() && !isValidDecimal(productForm.coveragePerUnit)) {
      notices.showError("Coverage per unit must be numeric with up to 4 decimals")
      return
    }

    setIsSaving(true)

    try {
      const payload = await requestJson<{ product: ProductRow }>(`/api/flooring/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          coveragePerUnit: productForm.coveragePerUnit.trim(),
        }),
      })

      setProduct(payload.product)
      setProductForm(toProductForm(payload.product))
      notices.showSuccess("Product updated")
    } catch (saveError) {
      notices.showError(saveError instanceof Error ? saveError.message : "Failed to save product")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteProduct() {
    notices.clearNotices()
    setIsSaving(true)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/products/${product.id}`, { method: "DELETE" })
      redirectToBack()
    } catch (deleteError) {
      notices.showError(deleteError instanceof Error ? deleteError.message : "Failed to delete product")
      setIsSaving(false)
    }
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    notices.clearNotices()
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

      setProductForm((prev) => ({
        ...prev,
        photoUrls: Array.from(new Set([...prev.photoUrls, ...uploadedUrls])),
      }))
      notices.showSuccess(`${uploadedUrls.length} photo${uploadedUrls.length === 1 ? "" : "s"} uploaded`)
    } catch (uploadError) {
      notices.showError(uploadError instanceof Error ? uploadError.message : "Failed to upload photos")
    } finally {
      setIsUploadingPhotos(false)
      event.target.value = ""
    }
  }

  function removePhotoUrl(url: string) {
    setProductForm((prev) => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((photoUrl) => photoUrl !== url),
    }))
  }

  function addBaseColorOption() {
    const trimmed = newBaseColor.trim()
    if (!trimmed) return
    setCustomBaseColors((prev) => Array.from(new Set([...prev, trimmed])).sort((a, b) => a.localeCompare(b)))
    setProductForm((prev) => ({ ...prev, baseColor: trimmed }))
    setNewBaseColor("")
  }

  return (
    <RecordDetailPageShell title={product.name || "Product"} backHref={backHref} onBack={closePage}>
      <div className="space-y-6">
        <FormStatusNotices
          message={notices.message}
          error={notices.error}
          loadingMessage={isSaving ? "Saving product..." : isUploadingPhotos ? "Uploading photos..." : ""}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Category Link">
            <select
              value={productForm.categoryId}
              onChange={(event) => setProductForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Coverage Unit">
            <input
              value={selectedCategory?.itemCoverageUnit ?? ""}
              readOnly
              className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75"
            />
          </FormField>
          <FormField label="Coverage Per Unit">
            <input
              value={productForm.coveragePerUnit}
              onChange={(event) => setProductForm((prev) => ({ ...prev, coveragePerUnit: event.target.value }))}
              placeholder="0.0000"
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Manufacturer Link">
            <select
              value={productForm.manufacturerId}
              onChange={(event) => setProductForm((prev) => ({ ...prev, manufacturerId: event.target.value }))}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            >
              <option value="">Select a manufacturer</option>
              {manufacturerOptions.map((manufacturer) => (
                <option key={manufacturer.id} value={manufacturer.id}>
                  {manufacturer.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Style">
            <input
              value={productForm.style}
              onChange={(event) => setProductForm((prev) => ({ ...prev, style: event.target.value }))}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Color">
            <input
              value={productForm.color}
              onChange={(event) => setProductForm((prev) => ({ ...prev, color: event.target.value }))}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Base Color">
            <select
              value={productForm.baseColor}
              onChange={(event) => setProductForm((prev) => ({ ...prev, baseColor: event.target.value }))}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            >
              <option value="">Select a base color</option>
              {baseColorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Add Base Color Option">
            <div className="flex gap-2">
              <input
                value={newBaseColor}
                onChange={(event) => setNewBaseColor(event.target.value)}
                className="flex-1 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
              <button type="button" onClick={addBaseColorOption} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
                Add
              </button>
            </div>
          </FormField>
          <FormField label="Width">
            <input
              value={productForm.width}
              onChange={(event) => setProductForm((prev) => ({ ...prev, width: event.target.value }))}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Sheet Size">
            <input
              value={productForm.sheetSize}
              onChange={(event) => setProductForm((prev) => ({ ...prev, sheetSize: event.target.value }))}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Thickness">
            <input
              value={productForm.thickness}
              onChange={(event) => setProductForm((prev) => ({ ...prev, thickness: event.target.value }))}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Unit Weight">
            <input
              value={productForm.unitWeight}
              onChange={(event) => setProductForm((prev) => ({ ...prev, unitWeight: event.target.value }))}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              value={productForm.notes}
              onChange={(event) => setProductForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="h-24 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2 xl:col-span-3"
            />
          </FormField>
          <FormField label="Photos">
            <div className="space-y-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm hover:bg-[var(--panel-hover)]">
                <Upload size={16} />
                Upload Photos
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </label>
              {productForm.photoUrls.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {productForm.photoUrls.map((url, index) => (
                    <div key={url} className="overflow-hidden rounded-xl border border-[var(--panel-border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Product photo previews use runtime-configured bucket URLs that are not statically known to next/image. */}
                      <img
                        src={url}
                        alt={`Product photo ${index + 1}`}
                        className="h-40 w-full bg-[var(--panel-hover)] object-cover"
                        loading="lazy"
                      />
                      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                        <span className="min-w-0 flex-1 truncate">{url}</span>
                        <button type="button" onClick={() => removePhotoUrl(url)} className="rounded p-1 hover:bg-[var(--panel-hover)]">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </FormField>
        </div>

        <RecordPanelFooter
          deleteLabel="Delete Product"
          deleteConfirmMessage={buildDeleteConfirmationMessage("product")}
          onDelete={() => void deleteProduct()}
          onClose={closePage}
          saveLabel="Save Product"
          savingLabel="Saving..."
          onSave={() => void saveProduct()}
          isSaving={isSaving || isUploadingPhotos}
        />

        <ProductInventoryRowsSection inventoryRows={inventoryRows} />
      </div>
    </RecordDetailPageShell>
  )
}
