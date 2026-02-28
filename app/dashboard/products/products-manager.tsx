"use client"

import type { Dispatch, ReactNode, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { ClipboardList, Plus, Trash2, X } from "lucide-react"
import type { CategoryDto, CategoryForm, ProductDto, ProductForm } from "./types"

type ProductsManagerProps = {
  initialProducts: ProductDto[]
  initialCategories: CategoryDto[]
}

type InlineDrafts = Record<string, Partial<Pick<ProductForm, "name" | "internalCost" | "customerCost">>>

const emptyProductForm: ProductForm = {
  name: "",
  description: "",
  categoryId: "",
  internalCost: "",
  customerCost: "",
  laborRate: "",
  coveragePerUnit: "",
  isActive: true,
}

const emptyCategoryForm: CategoryForm = {
  name: "",
  stockUnit: "",
  purchaseUnit: "",
  coverageUnit: "",
  rateUnit: "",
  altUnit: "",
}

function toProductForm(product: ProductDto): ProductForm {
  return {
    name: product.name,
    description: product.description ?? "",
    categoryId: product.categoryId,
    internalCost: product.internalCost,
    customerCost: product.customerCost,
    laborRate: product.laborRate,
    coveragePerUnit: product.coveragePerUnit,
    isActive: product.isActive,
  }
}

function toCategoryForm(category: CategoryDto): CategoryForm {
  return {
    name: category.name,
    stockUnit: category.stockUnit,
    purchaseUnit: category.purchaseUnit,
    coverageUnit: category.coverageUnit,
    rateUnit: category.rateUnit,
    altUnit: category.altUnit ?? "",
  }
}

function isValidDecimalInput(value: string, scale: number): boolean {
  const normalized = value.trim()
  if (!/^\d+(\.\d+)?$/.test(normalized)) return false
  return (normalized.split(".")[1]?.length ?? 0) <= scale
}

function formatToScale(value: string, scale: number): string {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return value
  return parsed.toFixed(scale)
}

function displayMoney(value: string): string {
  return formatToScale(value, 2)
}

function withFallbackUnit(unit: string | null | undefined): string {
  return unit && unit.trim() ? unit : "unit"
}

function UnitInput({
  value,
  unit,
  onChange,
  onBlur,
  className,
}: {
  value: string
  unit: string
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
}) {
  return (
    <div className={`flex items-center rounded border border-[var(--panel-border)] ${className ?? ""}`}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="min-w-0 flex-1 bg-transparent px-2 py-1 outline-none"
      />
      <span className="border-l border-[var(--panel-border)] px-2 py-1 text-xs text-[var(--foreground)]/70">
        {unit}
      </span>
    </div>
  )
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : "Request failed"
    throw new Error(message)
  }

  return payload as T
}

function FormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function ProductsManager({ initialProducts, initialCategories }: ProductsManagerProps) {
  const [products, setProducts] = useState<ProductDto[]>(initialProducts)
  const [categories, setCategories] = useState<CategoryDto[]>(initialCategories)
  const [inlineDrafts, setInlineDrafts] = useState<InlineDrafts>({})
  const [message, setMessage] = useState<string>("")
  const [error, setError] = useState<string>("")

  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [isEditProductOpen, setIsEditProductOpen] = useState(false)
  const [activeProduct, setActiveProduct] = useState<ProductDto | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm)
  const [isSavingProduct, setIsSavingProduct] = useState(false)

  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false)
  const [isCategoriesOverlayOpen, setIsCategoriesOverlayOpen] = useState(false)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryDto | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm)
  const [categoryInline, setCategoryInline] = useState<Record<string, CategoryForm>>({})
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === productForm.categoryId) ?? null,
    [categories, productForm.categoryId],
  )

  function clearNotices() {
    setMessage("")
    setError("")
  }

  function handleInlineDraftChange(productId: string, field: "name" | "internalCost" | "customerCost", value: string) {
    setInlineDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }))
  }

  function getInlineValue(product: ProductDto, field: "name" | "internalCost" | "customerCost") {
    return inlineDrafts[product.id]?.[field] ?? product[field]
  }

  async function saveInlineField(product: ProductDto, field: "name" | "internalCost" | "customerCost") {
    let rawValue = getInlineValue(product, field).toString().trim()

    if (field === "name" && rawValue.length === 0) {
      setError("Product name is required")
      return
    }

    if ((field === "internalCost" || field === "customerCost") && !isValidDecimalInput(rawValue, 2)) {
      setError(`${field} must be a valid number with up to 2 decimals`)
      return
    }

    if (field === "internalCost" || field === "customerCost") {
      rawValue = formatToScale(rawValue, 2)
      setInlineDrafts((prev) => ({
        ...prev,
        [product.id]: {
          ...prev[product.id],
          [field]: rawValue,
        },
      }))
    }

    clearNotices()

    try {
      const payload = await apiJson<{ product: ProductDto }>(`/api/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: rawValue }),
      })

      setProducts((prev) => prev.map((p) => (p.id === product.id ? payload.product : p)))
      setInlineDrafts((prev) => {
        const next = { ...prev }
        if (next[product.id]) {
          delete next[product.id][field]
          if (Object.keys(next[product.id]).length === 0) {
            delete next[product.id]
          }
        }
        return next
      })
      setMessage("Product updated")
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update product")
    }
  }

  async function toggleProductActive(product: ProductDto) {
    clearNotices()
    const previous = product.isActive

    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isActive: !previous } : p)))

    try {
      const payload = await apiJson<{ product: ProductDto }>(`/api/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !previous }),
      })

      setProducts((prev) => prev.map((p) => (p.id === product.id ? payload.product : p)))
      setMessage("Product status updated")
    } catch (toggleError) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isActive: previous } : p)))
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update product")
    }
  }

  async function deleteProduct(productId: string) {
    const approved = window.confirm("Delete this product?")
    if (!approved) return

    clearNotices()

    try {
      await apiJson<{ success: boolean }>(`/api/products/${productId}`, { method: "DELETE" })
      setProducts((prev) => prev.filter((product) => product.id !== productId))
      setMessage("Product deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete product")
    }
  }

  function openAddProductModal() {
    clearNotices()
    setActiveProduct(null)
    setProductForm({ ...emptyProductForm, categoryId: categories[0]?.id ?? "" })
    setIsAddProductOpen(true)
  }

  function openEditProductModal(product: ProductDto) {
    clearNotices()
    setActiveProduct(product)
    setProductForm(toProductForm(product))
    setIsEditProductOpen(true)
  }

  function handleFormDecimalBlur(field: "internalCost" | "customerCost" | "laborRate" | "coveragePerUnit", scale: number) {
    const value = productForm[field].trim()
    if (!value || !isValidDecimalInput(value, scale)) return

    setProductForm((prev) => ({
      ...prev,
      [field]: formatToScale(value, scale),
    }))
  }

  function validateProductForm(form: ProductForm): string | null {
    if (!form.name.trim()) return "name is required"
    if (!form.categoryId) return "category is required"
    if (!isValidDecimalInput(form.internalCost.trim(), 2)) return "internalCost must be numeric with up to 2 decimals"
    if (!isValidDecimalInput(form.customerCost.trim(), 2)) return "customerCost must be numeric with up to 2 decimals"
    if (!isValidDecimalInput(form.laborRate.trim(), 2)) return "laborRate must be numeric with up to 2 decimals"
    if (!isValidDecimalInput(form.coveragePerUnit.trim(), 4)) return "coveragePerUnit must be numeric with up to 4 decimals"

    return null
  }

  async function submitProductForm(mode: "create" | "edit") {
    clearNotices()
    const validationError = validateProductForm(productForm)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSavingProduct(true)

    try {
      const requestBody = {
        ...productForm,
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        internalCost: formatToScale(productForm.internalCost.trim(), 2),
        customerCost: formatToScale(productForm.customerCost.trim(), 2),
        laborRate: formatToScale(productForm.laborRate.trim(), 2),
        coveragePerUnit: formatToScale(productForm.coveragePerUnit.trim(), 4),
      }

      if (mode === "create") {
        const payload = await apiJson<{ product: ProductDto }>("/api/products", {
          method: "POST",
          body: JSON.stringify(requestBody),
        })

        setProducts((prev) => [payload.product, ...prev])
        setIsAddProductOpen(false)
        setMessage("Product created")
      }

      if (mode === "edit" && activeProduct) {
        const payload = await apiJson<{ product: ProductDto }>(`/api/products/${activeProduct.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        })

        setProducts((prev) => prev.map((product) => (product.id === activeProduct.id ? payload.product : product)))
        setIsEditProductOpen(false)
        setMessage("Product updated")
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save product")
    } finally {
      setIsSavingProduct(false)
    }
  }

  function openCategoriesOverlay() {
    setIsCategoryMenuOpen(false)
    setIsCategoriesOverlayOpen(true)
  }

  function getCategoryInline(category: CategoryDto): CategoryForm {
    return categoryInline[category.id] ?? toCategoryForm(category)
  }

  function setCategoryInlineValue(categoryId: string, field: keyof CategoryForm, value: string) {
    setCategoryInline((prev) => {
      const foundCategory = categories.find((category) => category.id === categoryId)
      if (!foundCategory) return prev

      const base = prev[categoryId] ?? toCategoryForm(foundCategory)
      return {
        ...prev,
        [categoryId]: {
          ...base,
          [field]: value,
        },
      }
    })
  }

  function validateCategoryForm(form: CategoryForm): string | null {
    if (!form.name.trim()) return "Category name is required"
    if (!form.stockUnit.trim()) return "stockUnit is required"
    if (!form.purchaseUnit.trim()) return "purchaseUnit is required"
    if (!form.coverageUnit.trim()) return "coverageUnit is required"
    if (!form.rateUnit.trim()) return "rateUnit is required"
    return null
  }

  async function saveInlineCategory(category: CategoryDto) {
    clearNotices()
    const form = getCategoryInline(category)
    const validationError = validateCategoryForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      const payload = await apiJson<{ category: CategoryDto }>(`/api/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      })

      setCategories((prev) => prev.map((item) => (item.id === category.id ? payload.category : item)))
      setCategoryInline((prev) => {
        const next = { ...prev }
        delete next[category.id]
        return next
      })
      setProducts((prev) =>
        prev.map((product) => {
          if (product.categoryId !== category.id) return product
          return {
            ...product,
            category: {
              ...product.category,
              ...payload.category,
            },
          }
        }),
      )
      setMessage("Category updated")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save category")
    }
  }

  function openAddCategoryModal() {
    clearNotices()
    setCategoryForm(emptyCategoryForm)
    setIsAddCategoryOpen(true)
  }

  function openEditCategoryModal(category: CategoryDto) {
    clearNotices()
    setActiveCategory(category)
    setCategoryForm(toCategoryForm(category))
    setIsEditCategoryOpen(true)
  }

  async function submitCategoryForm(mode: "create" | "edit") {
    clearNotices()
    const validationError = validateCategoryForm(categoryForm)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSavingCategory(true)

    try {
      const requestBody = {
        ...categoryForm,
        name: categoryForm.name.trim(),
        stockUnit: categoryForm.stockUnit.trim(),
        purchaseUnit: categoryForm.purchaseUnit.trim(),
        coverageUnit: categoryForm.coverageUnit.trim(),
        rateUnit: categoryForm.rateUnit.trim(),
        altUnit: categoryForm.altUnit.trim(),
      }

      if (mode === "create") {
        const payload = await apiJson<{ category: CategoryDto }>("/api/categories", {
          method: "POST",
          body: JSON.stringify(requestBody),
        })

        setCategories((prev) => [...prev, payload.category].sort((a, b) => a.name.localeCompare(b.name)))
        setIsAddCategoryOpen(false)
        setMessage("Category created")
      }

      if (mode === "edit" && activeCategory) {
        const payload = await apiJson<{ category: CategoryDto }>(`/api/categories/${activeCategory.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        })

        setCategories((prev) =>
          prev
            .map((category) => (category.id === activeCategory.id ? payload.category : category))
            .sort((a, b) => a.name.localeCompare(b.name)),
        )

        setProducts((prev) =>
          prev.map((product) => {
            if (product.categoryId !== activeCategory.id) return product
            return {
              ...product,
              category: {
                id: payload.category.id,
                name: payload.category.name,
                stockUnit: payload.category.stockUnit,
                purchaseUnit: payload.category.purchaseUnit,
                coverageUnit: payload.category.coverageUnit,
                rateUnit: payload.category.rateUnit,
                altUnit: payload.category.altUnit,
              },
            }
          }),
        )

        setIsEditCategoryOpen(false)
        setMessage("Category updated")
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save category")
    } finally {
      setIsSavingCategory(false)
    }
  }

  async function deleteCategory(categoryId: string) {
    const approved = window.confirm("Delete this category?")
    if (!approved) return

    clearNotices()

    try {
      await apiJson<{ success: boolean }>(`/api/categories/${categoryId}`, { method: "DELETE" })
      setCategories((prev) => prev.filter((category) => category.id !== categoryId))
      setMessage("Category deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete category")
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)]">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Product Management</h1>
            <p className="text-sm text-[var(--foreground)]/70">Manage products, pricing, and category-linked units.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                type="button"
                className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 transition hover:bg-[var(--panel-hover)]"
              >
                <ClipboardList size={18} />
              </button>
              {isCategoryMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] p-1 shadow-lg">
                  <button
                    onClick={openCategoriesOverlay}
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-[var(--panel-hover)]"
                  >
                    Categories
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={openAddProductModal}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400"
            >
              <Plus size={16} />
              Add Product
            </button>
          </div>
        </div>

        {message && <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p>}
        {error && <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Internal</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Labor</th>
                  <th className="px-3 py-2">Coverage</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="cursor-pointer border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]"
                    onClick={() => openEditProductModal(product)}
                  >
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <input
                        value={getInlineValue(product, "name")}
                        onChange={(event) => handleInlineDraftChange(product.id, "name", event.target.value)}
                        onBlur={() => saveInlineField(product, "name")}
                        className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">{product.category.name}</td>
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <UnitInput
                        value={getInlineValue(product, "internalCost")}
                        unit={withFallbackUnit(product.category.purchaseUnit)}
                        onChange={(value) => handleInlineDraftChange(product.id, "internalCost", value)}
                        onBlur={() => saveInlineField(product, "internalCost")}
                        className="w-36"
                      />
                    </td>
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <UnitInput
                        value={getInlineValue(product, "customerCost")}
                        unit={withFallbackUnit(product.category.purchaseUnit)}
                        onChange={(value) => handleInlineDraftChange(product.id, "customerCost", value)}
                        onBlur={() => saveInlineField(product, "customerCost")}
                        className="w-36"
                      />
                    </td>
                    <td className="px-3 py-2">{displayMoney(product.laborRate)} / {withFallbackUnit(product.category.rateUnit)}</td>
                    <td className="px-3 py-2">{product.coveragePerUnit} / {withFallbackUnit(product.category.coverageUnit)}</td>
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <button
                        onClick={() => toggleProductActive(product)}
                        type="button"
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          product.isActive
                            ? "bg-emerald-500/20 text-emerald-700"
                            : "bg-zinc-500/20 text-zinc-700"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product.id)}
                        className="rounded-md p-1 text-rose-600 transition hover:bg-rose-500/10"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No products yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAddProductOpen && (
        <ModalShell title="Add Product" onClose={() => setIsAddProductOpen(false)}>
          <ProductFormFields
            form={productForm}
            setForm={setProductForm}
            categories={categories}
            selectedCategory={selectedCategory}
            onDecimalBlur={handleFormDecimalBlur}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setIsAddProductOpen(false)}
              type="button"
              className="rounded-lg border border-[var(--panel-border)] px-4 py-2 transition hover:bg-[var(--panel-hover)]"
            >
              Cancel
            </button>
            <button
              onClick={() => submitProductForm("create")}
              disabled={isSavingProduct}
              type="button"
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400 disabled:opacity-60"
            >
              {isSavingProduct ? "Saving..." : "Create Product"}
            </button>
          </div>
        </ModalShell>
      )}

      {isEditProductOpen && activeProduct && (
        <ModalShell title="Edit Product" onClose={() => setIsEditProductOpen(false)}>
          <ProductFormFields
            form={productForm}
            setForm={setProductForm}
            categories={categories}
            selectedCategory={selectedCategory}
            onDecimalBlur={handleFormDecimalBlur}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setIsEditProductOpen(false)}
              type="button"
              className="rounded-lg border border-[var(--panel-border)] px-4 py-2 transition hover:bg-[var(--panel-hover)]"
            >
              Cancel
            </button>
            <button
              onClick={() => submitProductForm("edit")}
              disabled={isSavingProduct}
              type="button"
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400 disabled:opacity-60"
            >
              {isSavingProduct ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </ModalShell>
      )}

      {isCategoriesOverlayOpen && (
        <ModalShell title="Categories" onClose={() => setIsCategoriesOverlayOpen(false)}>
          <div className="mb-3 flex justify-end">
            <button
              onClick={openAddCategoryModal}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 font-semibold text-black transition hover:bg-blue-400"
            >
              <Plus size={15} />
              Add Category
            </button>
          </div>
          <div className="max-h-[55vh] overflow-auto rounded-lg border border-[var(--panel-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Stock Unit</th>
                  <th className="px-2 py-2">Purchase Unit</th>
                  <th className="px-2 py-2">Coverage Unit</th>
                  <th className="px-2 py-2">Rate Unit</th>
                  <th className="px-2 py-2">Alt Unit</th>
                  <th className="px-2 py-2">Products</th>
                  <th className="px-2 py-2">Save</th>
                  <th className="px-2 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const form = getCategoryInline(category)

                  return (
                    <tr
                      key={category.id}
                      className="cursor-pointer border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]"
                      onClick={() => openEditCategoryModal(category)}
                    >
                      <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                        <input
                          value={form.name}
                          onChange={(event) => setCategoryInlineValue(category.id, "name", event.target.value)}
                          className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                        <input
                          value={form.stockUnit}
                          onChange={(event) => setCategoryInlineValue(category.id, "stockUnit", event.target.value)}
                          className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                        <input
                          value={form.purchaseUnit}
                          onChange={(event) => setCategoryInlineValue(category.id, "purchaseUnit", event.target.value)}
                          className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                        <input
                          value={form.coverageUnit}
                          onChange={(event) => setCategoryInlineValue(category.id, "coverageUnit", event.target.value)}
                          className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                        <input
                          value={form.rateUnit}
                          onChange={(event) => setCategoryInlineValue(category.id, "rateUnit", event.target.value)}
                          className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                        <input
                          value={form.altUnit}
                          onChange={(event) => setCategoryInlineValue(category.id, "altUnit", event.target.value)}
                          className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2">{category.productCount}</td>
                      <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => saveInlineCategory(category)}
                          className="rounded-md border border-[var(--panel-border)] px-2 py-1 transition hover:bg-[var(--panel-hover)]"
                        >
                          Save
                        </button>
                      </td>
                      <td className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => deleteCategory(category.id)}
                          className="rounded-md p-1 text-rose-600 transition hover:bg-rose-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-2 py-8 text-center text-[var(--foreground)]/70">
                      No categories yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}

      {isAddCategoryOpen && (
        <ModalShell title="Add Category" onClose={() => setIsAddCategoryOpen(false)}>
          <CategoryFormFields form={categoryForm} setForm={setCategoryForm} />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setIsAddCategoryOpen(false)}
              type="button"
              className="rounded-lg border border-[var(--panel-border)] px-4 py-2 transition hover:bg-[var(--panel-hover)]"
            >
              Cancel
            </button>
            <button
              onClick={() => submitCategoryForm("create")}
              disabled={isSavingCategory}
              type="button"
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400 disabled:opacity-60"
            >
              {isSavingCategory ? "Saving..." : "Create Category"}
            </button>
          </div>
        </ModalShell>
      )}

      {isEditCategoryOpen && activeCategory && (
        <ModalShell title="Edit Category" onClose={() => setIsEditCategoryOpen(false)}>
          <CategoryFormFields form={categoryForm} setForm={setCategoryForm} />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setIsEditCategoryOpen(false)}
              type="button"
              className="rounded-lg border border-[var(--panel-border)] px-4 py-2 transition hover:bg-[var(--panel-hover)]"
            >
              Cancel
            </button>
            <button
              onClick={() => submitCategoryForm("edit")}
              disabled={isSavingCategory}
              type="button"
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400 disabled:opacity-60"
            >
              {isSavingCategory ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

function ProductFormFields({
  form,
  setForm,
  categories,
  selectedCategory,
  onDecimalBlur,
}: {
  form: ProductForm
  setForm: Dispatch<SetStateAction<ProductForm>>
  categories: CategoryDto[]
  selectedCategory: CategoryDto | null
  onDecimalBlur: (field: "internalCost" | "customerCost" | "laborRate" | "coveragePerUnit", scale: number) => void
}) {
  const purchaseUnit = withFallbackUnit(selectedCategory?.purchaseUnit)
  const coverageUnit = withFallbackUnit(selectedCategory?.coverageUnit)
  const rateUnit = withFallbackUnit(selectedCategory?.rateUnit)

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <FormField label="Name">
        <input
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
        />
      </FormField>
      <FormField label="Category">
        <select
          value={form.categoryId}
          onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
          className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Description">
        <textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2"
        />
      </FormField>

      <div className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 p-3 text-xs text-[var(--foreground)]/80 md:col-span-2">
        <span className="font-semibold text-[var(--foreground)]">Linked Units:</span>
        <span className="ml-2">Stock: {withFallbackUnit(selectedCategory?.stockUnit)}</span>
        <span className="ml-3">Purchase: {purchaseUnit}</span>
        <span className="ml-3">Coverage: {coverageUnit}</span>
        <span className="ml-3">Rate: {rateUnit}</span>
      </div>

      <FormField label="Internal Cost">
        <UnitInput
          value={form.internalCost}
          unit={purchaseUnit}
          onChange={(value) => setForm((prev) => ({ ...prev, internalCost: value }))}
          onBlur={() => onDecimalBlur("internalCost", 2)}
          className="px-1"
        />
      </FormField>
      <FormField label="Customer Cost">
        <UnitInput
          value={form.customerCost}
          unit={purchaseUnit}
          onChange={(value) => setForm((prev) => ({ ...prev, customerCost: value }))}
          onBlur={() => onDecimalBlur("customerCost", 2)}
          className="px-1"
        />
      </FormField>
      <FormField label="Labor Rate">
        <UnitInput
          value={form.laborRate}
          unit={rateUnit}
          onChange={(value) => setForm((prev) => ({ ...prev, laborRate: value }))}
          onBlur={() => onDecimalBlur("laborRate", 2)}
          className="px-1"
        />
      </FormField>
      <FormField label="Coverage Per Unit">
        <UnitInput
          value={form.coveragePerUnit}
          unit={coverageUnit}
          onChange={(value) => setForm((prev) => ({ ...prev, coveragePerUnit: value }))}
          onBlur={() => onDecimalBlur("coveragePerUnit", 4)}
          className="px-1"
        />
      </FormField>
      <FormField label="Active">
        <select
          value={form.isActive ? "true" : "false"}
          onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === "true" }))}
          className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </FormField>
    </div>
  )
}

function CategoryFormFields({
  form,
  setForm,
}: {
  form: CategoryForm
  setForm: Dispatch<SetStateAction<CategoryForm>>
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <FormField label="Name">
        <input
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
        />
      </FormField>
      <FormField label="Stock Unit">
        <input
          value={form.stockUnit}
          onChange={(event) => setForm((prev) => ({ ...prev, stockUnit: event.target.value }))}
          className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
        />
      </FormField>
      <FormField label="Purchase Unit">
        <input
          value={form.purchaseUnit}
          onChange={(event) => setForm((prev) => ({ ...prev, purchaseUnit: event.target.value }))}
          className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
        />
      </FormField>
      <FormField label="Coverage Unit">
        <input
          value={form.coverageUnit}
          onChange={(event) => setForm((prev) => ({ ...prev, coverageUnit: event.target.value }))}
          className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
        />
      </FormField>
      <FormField label="Rate Unit">
        <input
          value={form.rateUnit}
          onChange={(event) => setForm((prev) => ({ ...prev, rateUnit: event.target.value }))}
          className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
        />
      </FormField>
      <FormField label="Alt Unit (optional)">
        <input
          value={form.altUnit}
          onChange={(event) => setForm((prev) => ({ ...prev, altUnit: event.target.value }))}
          className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
        />
      </FormField>
    </div>
  )
}
