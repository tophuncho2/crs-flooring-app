"use client"

import { useState } from "react"

type TemplateRow = {
  id: string
  templateTag: string
  propertyId: string
  propertyName: string
  warehouseId: string
  warehouseName: string
  instructions: string
  templateNotes: string
  padProductId: string
  padTypeLabel: string
  createdAt: string
  updatedAt: string
}

type PropertyOption = {
  id: string
  name: string
}

type WarehouseOption = {
  id: string
  name: string
}

type PadProductOption = {
  id: string
  label: string
}

type DraftTemplate = {
  templateTag: string
  propertyId: string
  warehouseId: string
  instructions: string
  templateNotes: string
  padProductId: string
}

const defaultDraft: DraftTemplate = {
  templateTag: "",
  propertyId: "",
  warehouseId: "",
  instructions: "",
  templateNotes: "",
  padProductId: "",
}

export default function TemplatesClient({
  initialTemplates,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
}: {
  initialTemplates: TemplateRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
}) {
  const [templates, setTemplates] = useState<TemplateRow[]>(initialTemplates)
  const [drafts, setDrafts] = useState<Record<string, DraftTemplate>>({})
  const [newDraft, setNewDraft] = useState<DraftTemplate>(defaultDraft)
  const [showNewRow, setShowNewRow] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function getDraft(id: string): DraftTemplate {
    if (drafts[id]) return drafts[id]

    const row = templates.find((template) => template.id === id)
    if (!row) return defaultDraft

    return {
      templateTag: row.templateTag,
      propertyId: row.propertyId,
      warehouseId: row.warehouseId,
      instructions: row.instructions,
      templateNotes: row.templateNotes,
      padProductId: row.padProductId,
    }
  }

  function setDraftField(id: string, field: keyof DraftTemplate, value: string) {
    setDrafts((prev) => {
      const base = getDraft(id)
      return {
        ...prev,
        [id]: {
          ...base,
          [field]: value,
        },
      }
    })
  }

  function setNewDraftField(field: keyof DraftTemplate, value: string) {
    setNewDraft((prev) => ({ ...prev, [field]: value }))
  }

  async function createTemplate() {
    setError("")
    setMessage("")
    setIsSavingNew(true)

    try {
      if (!newDraft.propertyId) throw new Error("Property is required")
      if (!newDraft.templateTag.trim()) throw new Error("Template tag is required")

      const response = await fetch("/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDraft,
          warehouseId: newDraft.warehouseId || null,
          padProductId: newDraft.padProductId || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        template?: TemplateRow
      }

      if (!response.ok || !payload.template) {
        throw new Error(payload.error ?? "Failed to create template")
      }

      setTemplates((prev) => [payload.template!, ...prev])
      setShowNewRow(false)
      setNewDraft(defaultDraft)
      setMessage("Template created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create template")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function saveTemplate(row: TemplateRow) {
    setError("")
    setMessage("")
    setIsSavingId(row.id)

    try {
      const draft = getDraft(row.id)
      const response = await fetch(`/api/flooring/templates/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          warehouseId: draft.warehouseId || null,
          padProductId: draft.padProductId || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        template?: TemplateRow
      }

      if (!response.ok || !payload.template) {
        throw new Error(payload.error ?? "Failed to save template")
      }

      setTemplates((prev) => prev.map((template) => (template.id === row.id ? payload.template! : template)))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setMessage("Template saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template")
    } finally {
      setIsSavingId(null)
    }
  }

  async function deleteTemplate(id: string) {
    setError("")
    setMessage("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/flooring/templates/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete template")
      }

      setTemplates((prev) => prev.filter((template) => template.id !== id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setMessage("Template deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete template")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-12 pt-20 text-[var(--foreground)]">
      <section className="w-full border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-4">
        <h1 className="text-2xl font-bold text-blue-500">Templates</h1>
        <p className="mt-1 px-3 text-sm text-[var(--foreground)]/70">
          Manage flooring templates by property, warehouse, instructions, pad type, and notes.
        </p>

        {message && <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p>}
        {error && <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-4 overflow-x-auto border-y border-[var(--panel-border)]">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-[var(--panel-hover)] text-left">
              <tr>
                <th className="px-3 py-2">Template Tag</th>
                <th className="px-3 py-2">Property</th>
                <th className="px-3 py-2">Warehouse</th>
                <th className="px-3 py-2">Instructions</th>
                <th className="px-3 py-2">Pad Type</th>
                <th className="px-3 py-2">Template Notes</th>
                <th className="px-3 py-2">Save</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {showNewRow && (
                <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30">
                  <td className="px-3 py-2"><input value={newDraft.templateTag} onChange={(event) => setNewDraftField("templateTag", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  <td className="px-3 py-2">
                    <select value={newDraft.propertyId} onChange={(event) => setNewDraftField("propertyId", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                      <option value="">Select property</option>
                      {propertyOptions.map((property) => (
                        <option key={property.id} value={property.id}>{property.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select value={newDraft.warehouseId} onChange={(event) => setNewDraftField("warehouseId", event.target.value)} className="w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                      <option value="">No warehouse</option>
                      {warehouseOptions.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input value={newDraft.instructions} onChange={(event) => setNewDraftField("instructions", event.target.value)} className="w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  <td className="px-3 py-2">
                    <select value={newDraft.padProductId} onChange={(event) => setNewDraftField("padProductId", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                      <option value="">No pad type</option>
                      {padProductOptions.map((product) => (
                        <option key={product.id} value={product.id}>{product.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input value={newDraft.templateNotes} onChange={(event) => setNewDraftField("templateNotes", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => void createTemplate()} disabled={isSavingNew} className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60">
                      {isSavingNew ? "Adding..." : "Add"}
                    </button>
                  </td>
                  <td className="px-3 py-2">-</td>
                </tr>
              )}

              {templates.map((row) => {
                const draft = getDraft(row.id)

                return (
                  <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
                    <td className="px-3 py-2"><input value={draft.templateTag} onChange={(event) => setDraftField(row.id, "templateTag", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                    <td className="px-3 py-2">
                      <select value={draft.propertyId} onChange={(event) => setDraftField(row.id, "propertyId", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                        <option value="">Select property</option>
                        {propertyOptions.map((property) => (
                          <option key={property.id} value={property.id}>{property.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select value={draft.warehouseId} onChange={(event) => setDraftField(row.id, "warehouseId", event.target.value)} className="w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                        <option value="">No warehouse</option>
                        {warehouseOptions.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input value={draft.instructions} onChange={(event) => setDraftField(row.id, "instructions", event.target.value)} className="w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                    <td className="px-3 py-2">
                      <select value={draft.padProductId} onChange={(event) => setDraftField(row.id, "padProductId", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                        <option value="">No pad type</option>
                        {padProductOptions.map((product) => (
                          <option key={product.id} value={product.id}>{product.label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-[var(--foreground)]/60">{row.padTypeLabel || "-"}</p>
                    </td>
                    <td className="px-3 py-2"><input value={draft.templateNotes} onChange={(event) => setDraftField(row.id, "templateNotes", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => void saveTemplate(row)} disabled={isSavingId === row.id} className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60">
                        {isSavingId === row.id ? "Saving..." : "Save"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => void deleteTemplate(row.id)} disabled={deletingId === row.id} className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60">
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                )
              })}

              {templates.length === 0 && !showNewRow && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[var(--foreground)]/70">No templates yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={() => setShowNewRow(true)} disabled={showNewRow} className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60">
            Add Row
          </button>
          <a href="/dashboard/flooring" className="text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)]">Back to flooring</a>
        </div>
      </section>
    </div>
  )
}
