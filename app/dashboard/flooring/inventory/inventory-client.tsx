"use client"

import { useState } from "react"

type InventoryRow = {
  id: string
  productId: string
  productName: string
  itemNumber: string
  dyeLot: string
  locationId: string
  locationCode: string
  warehouseName: string
  sectionName: string
  stockCount: string
  notes: string
  createdAt: string
  updatedAt: string
}

type Option = {
  id: string
  label: string
}

type DraftInventory = {
  productId: string
  itemNumber: string
  dyeLot: string
  locationId: string
  stockCount: string
  notes: string
}

const defaultDraft: DraftInventory = {
  productId: "",
  itemNumber: "",
  dyeLot: "",
  locationId: "",
  stockCount: "",
  notes: "",
}

export default function InventoryClient({
  initialInventory,
  productOptions,
  locationOptions,
}: {
  initialInventory: InventoryRow[]
  productOptions: Option[]
  locationOptions: Option[]
}) {
  const [rows, setRows] = useState(initialInventory)
  const [drafts, setDrafts] = useState<Record<string, DraftInventory>>({})
  const [newDraft, setNewDraft] = useState<DraftInventory>(defaultDraft)
  const [showNewRow, setShowNewRow] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function getDraft(row: InventoryRow): DraftInventory {
    return drafts[row.id] ?? {
      productId: row.productId,
      itemNumber: row.itemNumber,
      dyeLot: row.dyeLot,
      locationId: row.locationId,
      stockCount: row.stockCount,
      notes: row.notes,
    }
  }

  function setDraftField(id: string, field: keyof DraftInventory, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...getDraft(rows.find((row) => row.id === id)!), [field]: value } }))
  }

  function setNewDraftField(field: keyof DraftInventory, value: string) {
    setNewDraft((prev) => ({ ...prev, [field]: value }))
  }

  async function createInventory() {
    setIsSavingNew(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/flooring/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      })
      const payload = (await response.json().catch(() => ({}))) as { inventory?: InventoryRow; error?: string }
      if (!response.ok || !payload.inventory) throw new Error(payload.error ?? "Failed to create inventory row")
      const created = payload.inventory
      setRows((prev) => [created, ...prev])
      setNewDraft(defaultDraft)
      setShowNewRow(false)
      setMessage("Inventory row created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create inventory row")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function saveInventory(row: InventoryRow) {
    setSavingId(row.id)
    setError("")
    setMessage("")

    try {
      const response = await fetch(`/api/flooring/inventory/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getDraft(row)),
      })
      const payload = (await response.json().catch(() => ({}))) as { inventory?: InventoryRow; error?: string }
      if (!response.ok || !payload.inventory) throw new Error(payload.error ?? "Failed to save inventory row")
      const saved = payload.inventory
      setRows((prev) => prev.map((item) => (item.id === row.id ? saved : item)))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setMessage("Inventory row saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save inventory row")
    } finally {
      setSavingId(null)
    }
  }

  async function deleteInventory(id: string) {
    setDeletingId(id)
    setError("")
    setMessage("")

    try {
      const response = await fetch(`/api/flooring/inventory/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete inventory row")
      setRows((prev) => prev.filter((row) => row.id !== id))
      setMessage("Inventory row deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete inventory row")
    } finally {
      setDeletingId(null)
    }
  }

  function renderEditor(draft: DraftInventory, onChange: (field: keyof DraftInventory, value: string) => void, saving: boolean, onSave: () => void, onDelete?: () => void, deleting = false) {
    return (
      <>
        <td className="px-3 py-2">
          <select value={draft.productId} onChange={(event) => onChange("productId", event.target.value)} className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
            <option value="">Select product</option>
            {productOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </td>
        <td className="px-3 py-2"><input value={draft.itemNumber} onChange={(event) => onChange("itemNumber", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
        <td className="px-3 py-2"><input value={draft.dyeLot} onChange={(event) => onChange("dyeLot", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
        <td className="px-3 py-2">
          <select value={draft.locationId} onChange={(event) => onChange("locationId", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
            <option value="">Select location</option>
            {locationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </td>
        <td className="px-3 py-2"><input value={draft.stockCount} onChange={(event) => onChange("stockCount", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
        <td className="px-3 py-2"><input value={draft.notes} onChange={(event) => onChange("notes", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
        <td className="px-3 py-2">
          <button type="button" onClick={onSave} disabled={saving} className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </td>
        <td className="px-3 py-2">
          {onDelete ? (
            <button type="button" onClick={onDelete} disabled={deleting} className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 hover:bg-rose-500/10 disabled:opacity-60">
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : (
            <span className="text-[var(--foreground)]/50">-</span>
          )}
        </td>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <h1 className="text-2xl font-bold text-blue-500">Inventory</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/70">Manage flooring stock by product, lot, and location.</p>
        {message ? <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--panel-hover)] text-left">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Item #</th>
                <th className="px-3 py-2">Dye Lot</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Save</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {showNewRow ? (
                <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30">
                  {renderEditor(newDraft, setNewDraftField, isSavingNew, () => void createInventory())}
                </tr>
              ) : null}
              {rows.map((row) => {
                const draft = getDraft(row)
                return (
                  <tr key={row.id} className="border-t border-[var(--panel-border)]">
                    {renderEditor(
                      draft,
                      (field, value) => setDraftField(row.id, field, value),
                      savingId === row.id,
                      () => void saveInventory(row),
                      () => void deleteInventory(row.id),
                      deletingId === row.id,
                    )}
                  </tr>
                )
              })}
              {rows.length === 0 && !showNewRow ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[var(--foreground)]/70">No inventory rows yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <button type="button" onClick={() => setShowNewRow((prev) => !prev)} className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)]">
            {showNewRow ? "Cancel" : "Add Inventory Row"}
          </button>
        </div>
      </section>
    </div>
  )
}
