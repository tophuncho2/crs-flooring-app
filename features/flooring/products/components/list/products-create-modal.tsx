"use client"

import { Save, Upload, X } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/flooring/shared/ui/display/accent-styles"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "@/features/flooring/shared/ui/forms/record-form"
import type {
  CategoryOption,
  ManufacturerOption,
  ProductForm,
} from "@/features/flooring/products/controllers/use-products-list-controller"

export function ProductsCreateModal({
  isOpen,
  onClose,
  productForm,
  selectedCategory,
  manufacturerOptions,
  categoryOptions,
  baseColorOptions,
  newBaseColor,
  onNewBaseColorChange,
  onAddBaseColorOption,
  onFieldChange,
  onPhotoUpload,
  onRemovePhotoUrl,
  onSave,
  isSaving,
  isUploadingPhotos,
  message,
  error,
}: {
  isOpen: boolean
  onClose: () => void
  productForm: ProductForm
  selectedCategory: CategoryOption | null
  manufacturerOptions: ManufacturerOption[]
  categoryOptions: CategoryOption[]
  baseColorOptions: string[]
  newBaseColor: string
  onNewBaseColorChange: (value: string) => void
  onAddBaseColorOption: () => void
  onFieldChange: (field: keyof ProductForm, value: string | string[]) => void
  onPhotoUpload: React.ChangeEventHandler<HTMLInputElement>
  onRemovePhotoUrl: (url: string) => void
  onSave: () => void
  isSaving: boolean
  isUploadingPhotos: boolean
  message: string
  error: string
}) {
  if (!isOpen) return null

  return (
    <ModalShell title="Add Product" onClose={onClose}>
      <div className="space-y-5">
        <FormStatusNotices
          message={message}
          error={error}
          loadingMessage={isSaving ? "Saving product..." : isUploadingPhotos ? "Uploading photos..." : ""}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Category Link">
            <select
              value={productForm.categoryId}
              onChange={(event) => onFieldChange("categoryId", event.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            >
              <option value="">Select a category</option>
              {categoryOptions.map((category) => (
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
              onChange={(event) => onFieldChange("coveragePerUnit", event.target.value)}
              placeholder="0.0000"
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </FormField>
          <FormField label="Manufacturer Link">
            <select
              value={productForm.manufacturerId}
              onChange={(event) => onFieldChange("manufacturerId", event.target.value)}
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
            <input value={productForm.style} onChange={(event) => onFieldChange("style", event.target.value)} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </FormField>
          <FormField label="Color">
            <input value={productForm.color} onChange={(event) => onFieldChange("color", event.target.value)} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </FormField>
          <FormField label="Base Color">
            <select
              value={productForm.baseColor}
              onChange={(event) => onFieldChange("baseColor", event.target.value)}
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
              <input value={newBaseColor} onChange={(event) => onNewBaseColorChange(event.target.value)} className="flex-1 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              <button type="button" onClick={onAddBaseColorOption} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
                Add
              </button>
            </div>
          </FormField>
          <FormField label="Width">
            <input value={productForm.width} onChange={(event) => onFieldChange("width", event.target.value)} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </FormField>
          <FormField label="Sheet Size">
            <input value={productForm.sheetSize} onChange={(event) => onFieldChange("sheetSize", event.target.value)} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </FormField>
          <FormField label="Thickness">
            <input value={productForm.thickness} onChange={(event) => onFieldChange("thickness", event.target.value)} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </FormField>
          <FormField label="Unit Weight">
            <input value={productForm.unitWeight} onChange={(event) => onFieldChange("unitWeight", event.target.value)} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </FormField>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="space-y-3">
            <FormField label="Notes">
              <textarea
                value={productForm.notes}
                onChange={(event) => onFieldChange("notes", event.target.value)}
                rows={5}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </FormField>
            <div className="rounded-xl border border-[var(--panel-border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">Photos</h3>
                  <p className="text-xs text-[var(--foreground)]/65">Upload photos through the bucket path before creating the product.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm hover:bg-[var(--panel-hover)]">
                  <Upload size={16} />
                  {isUploadingPhotos ? "Uploading..." : "Upload Photos"}
                  <input type="file" accept="image/*" multiple onChange={onPhotoUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--panel-border)] p-3">
            <h3 className="font-medium">Preview</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {productForm.photoUrls.map((url) => (
                <div key={url} className="overflow-hidden rounded-lg border border-[var(--panel-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Product preview" className="h-28 w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border)] px-2 py-2">
                    <span className="truncate text-xs text-[var(--foreground)]/65">{url}</span>
                    <button type="button" onClick={() => onRemovePhotoUrl(url)} className="rounded-md p-1 text-rose-500 hover:bg-rose-500/10">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {productForm.photoUrls.length === 0 ? (
                <p className="col-span-2 rounded-lg border border-dashed border-[var(--panel-border)] px-3 py-6 text-center text-sm text-[var(--foreground)]/60">
                  No photos added yet.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isUploadingPhotos}
            className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
