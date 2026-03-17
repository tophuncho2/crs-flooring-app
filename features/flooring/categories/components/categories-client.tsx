"use client"

import { type ReactNode, useState } from "react"
import { Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { TableActionsSummary } from "../../shared/table-shell"

type CategoryRow = {
  id: string
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
  productCount: number
  createdAt: string
}

type CategoryForm = {
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
}

type UnitOfMeasureOption = {
  id: string
  name: string
  createdAt: string
}

const emptyCategoryForm: CategoryForm = {
  name: "",
  sendUnitId: "",
  stockUnitId: "",
  coverageAvailableUnitId: "",
  itemCoverageUnitId: "",
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 p-4 pt-24 sm:p-6 sm:pt-28">
      <div className="flex min-h-full items-start justify-center">
        <div className="flex max-h-[calc(100vh-7rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl sm:max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]">
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
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

function toCategoryForm(category: CategoryRow): CategoryForm {
  return {
    name: category.name,
    sendUnitId: category.sendUnitId,
    stockUnitId: category.stockUnitId,
    coverageAvailableUnitId: category.coverageAvailableUnitId,
    itemCoverageUnitId: category.itemCoverageUnitId,
  }
}

function UnitSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: UnitOfMeasureOption[]
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2">
      <option value="">None</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  )
}

export default function CategoriesClient({
  initialCategories,
  unitOfMeasureOptions,
}: {
  initialCategories: CategoryRow[]
  unitOfMeasureOptions: UnitOfMeasureOption[]
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm)
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  function clearNotices() {
    setMessage("")
    setError("")
  }

  function openCreateCategory() {
    clearNotices()
    setEditingCategory(null)
    setCategoryForm(emptyCategoryForm)
    setIsCategoryModalOpen(true)
  }

  function openEditCategory(category: CategoryRow) {
    clearNotices()
    setEditingCategory(category)
    setCategoryForm(toCategoryForm(category))
    setIsCategoryModalOpen(true)
  }

  async function saveCategory() {
    clearNotices()
    if (!categoryForm.name.trim()) {
      setError("Category name is required")
      return
    }

    setIsSavingCategory(true)
    try {
      const payload = editingCategory
        ? await apiJson<{ category: CategoryRow }>(`/api/flooring/categories/${editingCategory.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(categoryForm),
          })
        : await apiJson<{ category: CategoryRow }>("/api/flooring/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(categoryForm),
          })

      setCategories((prev) => {
        const next = editingCategory
          ? prev.map((category) => (category.id === payload.category.id ? payload.category : category))
          : [...prev, payload.category]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      setIsCategoryModalOpen(false)
      setMessage(editingCategory ? "Category updated" : "Category created")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save category")
    } finally {
      setIsSavingCategory(false)
    }
  }

  async function deleteCategory(category: CategoryRow) {
    if (!window.confirm(`Delete ${category.name}?`)) return
    clearNotices()
    try {
      await apiJson<{ success: boolean }>(`/api/flooring/categories/${category.id}`, { method: "DELETE" })
      setCategories((prev) => prev.filter((item) => item.id !== category.id))
      setMessage("Category deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete category")
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Categories</h1>
            <p className="text-sm text-[var(--foreground)]/70">Manage flooring product categories and units.</p>
          </div>
          <TableActionsSummary count={categories.length}>
            <button type="button" onClick={openCreateCategory} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400">
              <Plus size={16} />
              Category
            </button>
          </TableActionsSummary>
        </div>

        {message ? <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

        <section className="mt-6">
          <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)]">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="h-10 px-3 py-2">Category</th>
                  <th className="h-10 px-3 py-2">Send Unit</th>
                  <th className="h-10 px-3 py-2">Stock Unit</th>
                  <th className="h-10 px-3 py-2">Coverage Available Unit</th>
                  <th className="h-10 px-3 py-2">Item Coverage Unit</th>
                  <th className="h-10 px-3 py-2">Products</th>
                  <th className="h-10 px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-t border-[var(--panel-border)]">
                    <td className="px-3 py-2 font-medium">{category.name}</td>
                    <td className="px-3 py-2">{category.sendUnit || "-"}</td>
                    <td className="px-3 py-2">{category.stockUnit || "-"}</td>
                    <td className="px-3 py-2">{category.coverageAvailableUnit || "-"}</td>
                    <td className="px-3 py-2">{category.itemCoverageUnit || "-"}</td>
                    <td className="px-3 py-2">{category.productCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEditCategory(category)} className="rounded-md p-2 hover:bg-[var(--panel-hover)]">
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => deleteCategory(category)} className="rounded-md p-2 text-rose-500 hover:bg-rose-500/10">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-[var(--foreground)]/60">No flooring categories yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isCategoryModalOpen ? (
        <ModalShell title={editingCategory ? "Edit Category" : "Add Category"} onClose={() => setIsCategoryModalOpen(false)}>
          <div className="space-y-5">
          {message ? <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormField label="Category Name">
              <input value={categoryForm.name} onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))} className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
            <FormField label="Send Unit">
              <UnitSelect value={categoryForm.sendUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...prev, sendUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Stock Unit">
              <UnitSelect value={categoryForm.stockUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...prev, stockUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Coverage Available Unit">
              <UnitSelect value={categoryForm.coverageAvailableUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...prev, coverageAvailableUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
            <FormField label="Item Coverage Unit">
              <UnitSelect value={categoryForm.itemCoverageUnitId} onChange={(value) => setCategoryForm((prev) => ({ ...prev, itemCoverageUnitId: value }))} options={unitOfMeasureOptions} />
            </FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm">Cancel</button>
            <button type="button" onClick={saveCategory} disabled={isSavingCategory} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60">
              <Save size={16} />
              {isSavingCategory ? "Saving..." : "Save Category"}
            </button>
          </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
