"use client"

import { type ChangeEvent, type ReactNode, useState } from "react"
import { Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react"

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

const emptyProductForm: ProductForm = {
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

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 p-4 pt-24 sm:p-6 sm:pt-28">
      <div className="flex min-h-full items-start justify-center">
        <div className="flex max-h-[calc(100vh-7rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl sm:max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Request failed")
  }

  return payload as T
}

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

export default function FlooringProductsClient({
  categoryOptions,
  manufacturerOptions,
  initialProducts,
}: {
  categoryOptions: CategoryOption[]
  manufacturerOptions: ManufacturerOption[]
  initialProducts: ProductRow[]
}) {
  const categories = categoryOptions
  const [products, setProducts] = useState(initialProducts)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [newPhotoUrl, setNewPhotoUrl] = useState("")
  const [newBaseColor, setNewBaseColor] = useState("")
  const [customBaseColors, setCustomBaseColors] = useState<string[]>([])

  const selectedCategory = categories.find((category) => category.id === productForm.categoryId) ?? null
  const baseColorOptions = Array.from(
    new Set(
      [...DEFAULT_BASE_COLOR_OPTIONS, ...customBaseColors, ...products.map((product) => product.baseColor)]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b))

  function clearNotices() {
    setMessage("")
    setError("")
  }

  function openCreateProduct() {
    clearNotices()
    setEditingProduct(null)
    setProductForm(emptyProductForm)
    setNewPhotoUrl("")
    setNewBaseColor("")
    setIsProductModalOpen(true)
  }

  function openEditProduct(product: ProductRow) {
    clearNotices()
    setEditingProduct(product)
    setProductForm(toProductForm(product))
    setNewPhotoUrl("")
    setNewBaseColor("")
    setIsProductModalOpen(true)
  }

  async function saveProduct() {
    clearNotices()
    if (!productForm.categoryId) {
      setError("Category is required")
      return
    }
    if (productForm.coveragePerUnit.trim() && !isValidDecimal(productForm.coveragePerUnit)) {
      setError("Coverage per unit must be numeric with up to 4 decimals")
      return
    }

    setIsSavingProduct(true)
    try {
      const body = {
        ...productForm,
        coveragePerUnit: productForm.coveragePerUnit.trim(),
      }

      const payload = editingProduct
        ? await apiJson<{ product: ProductRow }>(`/api/flooring/products/${editingProduct.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await apiJson<{ product: ProductRow }>("/api/flooring/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })

      setProducts((prev) => {
        const next = editingProduct
          ? prev.map((product) => (product.id === payload.product.id ? payload.product : product))
          : [payload.product, ...prev]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      setIsProductModalOpen(false)
      setMessage(editingProduct ? "Product updated" : "Product created")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save product")
    } finally {
      setIsSavingProduct(false)
    }
  }

  async function deleteProduct(product: ProductRow) {
    if (!window.confirm(`Delete ${product.name || "this product"}?`)) return
    clearNotices()

    try {
      await apiJson<{ success: boolean }>(`/api/flooring/products/${product.id}`, { method: "DELETE" })
      setProducts((prev) => prev.filter((item) => item.id !== product.id))
      setMessage("Product deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete product")
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
        const payload = await apiJson<{ url: string }>("/api/flooring/product-photos", {
          method: "POST",
          body: formData,
        })
        uploadedUrls.push(payload.url)
      }

      setProductForm((prev) => ({
        ...prev,
        photoUrls: Array.from(new Set([...prev.photoUrls, ...uploadedUrls])),
      }))
      setMessage(`${uploadedUrls.length} photo${uploadedUrls.length === 1 ? "" : "s"} uploaded`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload photos")
    } finally {
      setIsUploadingPhotos(false)
      event.target.value = ""
    }
  }

  function addPhotoUrl() {
    const trimmed = newPhotoUrl.trim()
    if (!trimmed) return
    setProductForm((prev) => ({
      ...prev,
      photoUrls: Array.from(new Set([...prev.photoUrls, trimmed])),
    }))
    setNewPhotoUrl("")
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
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Flooring Products</h1>
            <p className="text-sm text-[var(--foreground)]/70">
              Manage flooring product attributes, bucket photo previews, and category-linked coverage units.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreateProduct}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400"
            >
              <Plus size={16} />
              Product
            </button>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Products</h2>
            <span className="text-xs text-[var(--foreground)]/60">{products.length} total</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)]">
            <table className="w-full min-w-[1400px] text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Manufacturer</th>
                  <th className="px-3 py-2">Style</th>
                  <th className="px-3 py-2">Color</th>
                  <th className="px-3 py-2">Base Color</th>
                  <th className="px-3 py-2">Coverage</th>
                  <th className="px-3 py-2">Width</th>
                  <th className="px-3 py-2">Sheet Size</th>
                  <th className="px-3 py-2">Thickness</th>
                  <th className="px-3 py-2">Unit Weight</th>
                  <th className="px-3 py-2">Photos</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-[var(--panel-border)]">
                    <td className="px-3 py-2 font-medium">{product.name || "Pending name"}</td>
                    <td className="px-3 py-2">{product.category.name}</td>
                    <td className="px-3 py-2">{product.manufacturerName || "-"}</td>
                    <td className="px-3 py-2">{product.style || "-"}</td>
                    <td className="px-3 py-2">{product.color || "-"}</td>
                    <td className="px-3 py-2">{product.baseColor || "-"}</td>
                    <td className="px-3 py-2">
                      {product.coveragePerUnit ? `${product.coveragePerUnit} / ${product.coverageUnit || "unit"}` : "-"}
                    </td>
                    <td className="px-3 py-2">{product.width || "-"}</td>
                    <td className="px-3 py-2">{product.sheetSize || "-"}</td>
                    <td className="px-3 py-2">{product.thickness || "-"}</td>
                    <td className="px-3 py-2">{product.unitWeight || "-"}</td>
                    <td className="px-3 py-2">{product.photoUrls.length}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEditProduct(product)} className="rounded-md p-2 hover:bg-[var(--panel-hover)]">
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => deleteProduct(product)} className="rounded-md p-2 text-rose-500 hover:bg-rose-500/10">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-8 text-center text-[var(--foreground)]/60">
                      No flooring products yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isProductModalOpen ? (
        <ModalShell title={editingProduct ? "Edit Product" : "Add Product"} onClose={() => setIsProductModalOpen(false)}>
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
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
            <div className="space-y-3">
              <FormField label="Notes">
                <textarea
                  value={productForm.notes}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={5}
                  className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>
              <div className="rounded-xl border border-[var(--panel-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Photos</h3>
                    <p className="text-xs text-[var(--foreground)]/65">Upload to the bucket or attach an existing bucket URL.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm hover:bg-[var(--panel-hover)]">
                    <Upload size={16} />
                    {isUploadingPhotos ? "Uploading..." : "Upload Photos"}
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={newPhotoUrl}
                    onChange={(event) => setNewPhotoUrl(event.target.value)}
                    placeholder="https://bucket.example/path/image.jpg"
                    className="flex-1 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={addPhotoUrl} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
                    Add URL
                  </button>
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
                      <button type="button" onClick={() => removePhotoUrl(url)} className="rounded-md p-1 text-rose-500 hover:bg-rose-500/10">
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

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setIsProductModalOpen(false)} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={saveProduct}
              disabled={isSavingProduct || isUploadingPhotos}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              <Save size={16} />
              {isSavingProduct ? "Saving..." : "Save Product"}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
