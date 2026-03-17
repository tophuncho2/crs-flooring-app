"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, OpenRowButton, SaveRowButton } from "../../shared/row-action-buttons"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { ModalTableHead, ModalTableShell, TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "../../shared/table-shell"
import { useTableColumns } from "../../shared/use-table-columns"
import { useTableControls } from "../../shared/use-table-controls"

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

type ProductOption = {
  id: string
  label: string
  sendUnit: string
}

type DraftTemplate = {
  templateTag: string
  propertyId: string
  warehouseId: string
  instructions: string
  templateNotes: string
  padProductId: string
}

type TemplateItem = {
  id: string
  productId: string
  productName: string
  sendUnit: string
  quantity: string
  notes: string
  storedDyeLot: string
  createdAt: string
}

type TemplateItemDraft = {
  productId: string
  quantity: string
  notes: string
  storedDyeLot: string
}

const defaultDraft: DraftTemplate = {
  templateTag: "",
  propertyId: "",
  warehouseId: "",
  instructions: "",
  templateNotes: "",
  padProductId: "",
}

const emptyItemDraft: TemplateItemDraft = {
  productId: "",
  quantity: "",
  notes: "",
  storedDyeLot: "",
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

export default function TemplatesClient({
  initialTemplates,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  productOptions,
}: {
  initialTemplates: TemplateRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  productOptions: ProductOption[]
}) {
  const [templates, setTemplates] = useState<TemplateRow[]>(initialTemplates)
  const [drafts, setDrafts] = useState<Record<string, DraftTemplate>>({})
  const [newDraft, setNewDraft] = useState<DraftTemplate>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [activeTemplateDraft, setActiveTemplateDraft] = useState<DraftTemplate>(defaultDraft)
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([])
  const [itemDraft, setItemDraft] = useState<TemplateItemDraft>(emptyItemDraft)
  const [loadingItems, setLoadingItems] = useState(false)
  const [isSavingTemplateModal, setIsSavingTemplateModal] = useState(false)
  const [isSavingItem, setIsSavingItem] = useState(false)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const activeTemplate = templates.find((template) => template.id === activeTemplateId) ?? null
  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    filteredRows: filteredTemplates,
    sortedRows: sortedTemplates,
    groupedRows: groupedTemplates,
  } = useTableControls({
    rows: templates,
    searchFields: [{ key: "propertyName", getValue: (row) => row.propertyName }],
    sortField: (row) => `${row.propertyName} ${row.templateTag}`,
    groupFields: [{ key: "propertyName", label: "Property", getValue: (row) => row.propertyName }],
    defaultGrouped: true,
  })
  const templateColumns = useMemo(
    () => [
      { key: "open", label: "Open" },
      { key: "templateTag", label: "Template Tag" },
      { key: "property", label: "Property" },
      { key: "warehouse", label: "Warehouse" },
      { key: "instructions", label: "Instructions" },
      { key: "padType", label: "Pad Type" },
      { key: "templateNotes", label: "Template Notes" },
      { key: "save", label: "Save" },
      { key: "delete", label: "Delete" },
    ],
    [],
  )
  const {
    allColumns: orderedTemplateColumns,
    visibleColumns: visibleTemplateColumns,
    hiddenColumnKeys: hiddenTemplateColumnKeys,
    toggleColumnVisibility: toggleTemplateColumnVisibility,
    moveColumn: moveTemplateColumn,
    setColumnOrder: setTemplateColumnOrder,
  } = useTableColumns({
    tableKey: "templates-main",
    columns: templateColumns,
  })

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

  function openCreateTemplate() {
    setMessage("")
    setError("")
    setNewDraft(defaultDraft)
    setIsCreateModalOpen(true)
  }

  function closeCreateTemplate() {
    if (isSavingNew) return
    setIsCreateModalOpen(false)
  }

  async function loadTemplateItems(templateId: string) {
    setLoadingItems(true)

    try {
      const response = await fetch(`/api/flooring/templates/${templateId}/items`)
      const payload = (await response.json().catch(() => ({}))) as { items?: TemplateItem[]; error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load template items")
      }

      setTemplateItems(payload.items ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load template items")
      setTemplateItems([])
    } finally {
      setLoadingItems(false)
    }
  }

  async function openTemplate(row: TemplateRow) {
    setMessage("")
    setError("")
    setActiveTemplateDraft({
      templateTag: row.templateTag,
      propertyId: row.propertyId,
      warehouseId: row.warehouseId,
      instructions: row.instructions,
      templateNotes: row.templateNotes,
      padProductId: row.padProductId,
    })
    setItemDraft(emptyItemDraft)
    setActiveTemplateId(row.id)
    await loadTemplateItems(row.id)
  }

  function closeTemplate() {
    if (isSavingTemplateModal || isSavingItem || savingItemId || deletingItemId) return
    setActiveTemplateId(null)
    setTemplateItems([])
    setItemDraft(emptyItemDraft)
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
      setNewDraft(defaultDraft)
      setIsCreateModalOpen(false)
      setActiveTemplateDraft({
        templateTag: payload.template.templateTag,
        propertyId: payload.template.propertyId,
        warehouseId: payload.template.warehouseId,
        instructions: payload.template.instructions,
        templateNotes: payload.template.templateNotes,
        padProductId: payload.template.padProductId,
      })
      setActiveTemplateId(payload.template.id)
      setTemplateItems([])
      setItemDraft(emptyItemDraft)
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

  async function saveActiveTemplate() {
    if (!activeTemplate) return

    setError("")
    setMessage("")
    setIsSavingTemplateModal(true)

    try {
      const response = await fetch(`/api/flooring/templates/${activeTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...activeTemplateDraft,
          warehouseId: activeTemplateDraft.warehouseId || null,
          padProductId: activeTemplateDraft.padProductId || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; template?: TemplateRow }
      if (!response.ok || !payload.template) {
        throw new Error(payload.error ?? "Failed to save template")
      }

      setTemplates((prev) => prev.map((template) => (template.id === activeTemplate.id ? payload.template! : template)))
      setActiveTemplateDraft({
        templateTag: payload.template.templateTag,
        propertyId: payload.template.propertyId,
        warehouseId: payload.template.warehouseId,
        instructions: payload.template.instructions,
        templateNotes: payload.template.templateNotes,
        padProductId: payload.template.padProductId,
      })
      setMessage("Template saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template")
    } finally {
      setIsSavingTemplateModal(false)
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
      if (activeTemplateId === id) {
        setActiveTemplateId(null)
        setTemplateItems([])
      }
      setMessage("Template deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete template")
    } finally {
      setDeletingId(null)
    }
  }

  async function addTemplateItem() {
    if (!activeTemplate) return

    setError("")
    setMessage("")
    setIsSavingItem(true)

    try {
      if (!itemDraft.productId) throw new Error("Product is required")
      if (!itemDraft.quantity.trim()) throw new Error("Quantity is required")

      const response = await fetch(`/api/flooring/templates/${activeTemplate.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add template item")
      }

      setItemDraft(emptyItemDraft)
      await loadTemplateItems(activeTemplate.id)
      setMessage("Template item added")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add template item")
    } finally {
      setIsSavingItem(false)
    }
  }

  async function saveTemplateItem(item: TemplateItem) {
    if (!activeTemplate) return

    setError("")
    setMessage("")
    setSavingItemId(item.id)

    try {
      const response = await fetch(`/api/flooring/templates/${activeTemplate.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
          storedDyeLot: item.storedDyeLot,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save template item")
      }

      await loadTemplateItems(activeTemplate.id)
      setMessage("Template item saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template item")
    } finally {
      setSavingItemId(null)
    }
  }

  async function deleteTemplateItem(itemId: string) {
    if (!activeTemplate) return

    setError("")
    setMessage("")
    setDeletingItemId(itemId)

    try {
      const response = await fetch(`/api/flooring/templates/${activeTemplate.id}/items/${itemId}`, {
        method: "DELETE",
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete template item")
      }

      setTemplateItems((prev) => prev.filter((item) => item.id !== itemId))
      setMessage("Template item deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete template item")
    } finally {
      setDeletingItemId(null)
    }
  }

  function setTemplateItemField(itemId: string, field: keyof Omit<TemplateItem, "id" | "createdAt">, value: string) {
    setTemplateItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Templates</h1>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              Manage flooring templates by property, warehouse, instructions, pad type, and notes.
            </p>
          </div>
          <TableActionsSummary count={filteredTemplates.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search property"
              isAscendingSort={isAscendingSort}
              onToggleSort={() => setIsAscendingSort((prev) => !prev)}
              isGroupingEnabled={isGroupingEnabled}
              onToggleGrouping={() => setIsGroupingEnabled((prev) => !prev)}
            >
              <TableColumnSettings
                columns={orderedTemplateColumns}
                hiddenColumnKeys={hiddenTemplateColumnKeys}
                onToggleColumn={toggleTemplateColumnVisibility}
                onMoveColumn={moveTemplateColumn}
                onSetColumnOrder={setTemplateColumnOrder}
              />
              <button
                type="button"
                onClick={openCreateTemplate}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400"
              >
                <Plus size={16} />
                Template
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
        {error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[1260px]">
            <TableHead>
              <tr>
                {visibleTemplateColumns.map((column) => (
                  <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
                ))}
              </tr>
            </TableHead>
            <tbody>
              {(isGroupingEnabled
                ? groupedTemplates.flatMap(([propertyName, groupRows]) => [
                    { type: "group" as const, propertyName },
                    ...groupRows.map((row) => ({ type: "row" as const, row })),
                  ])
                : sortedTemplates.map((row) => ({ type: "row" as const, row }))
              ).map((entry) => {
                if (entry.type === "group") {
                  return <TableGroupRow key={`group-${entry.propertyName}`} label={entry.propertyName} colSpan={visibleTemplateColumns.length} />
                }

                const row = entry.row
                const draft = getDraft(row.id)
                const cells: Record<string, ReactNode> = {
                  open: (
                    <td key="open" className="px-3 py-2">
                      <OpenRowButton onClick={() => void openTemplate(row)} />
                    </td>
                  ),
                  templateTag: (
                    <td key="templateTag" className="px-3 py-2"><input value={draft.templateTag} onChange={(event) => setDraftField(row.id, "templateTag", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  ),
                  property: (
                    <td key="property" className="px-3 py-2">
                      <select value={draft.propertyId} onChange={(event) => setDraftField(row.id, "propertyId", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                        <option value="">Select property</option>
                        {propertyOptions.map((property) => (
                          <option key={property.id} value={property.id}>{property.name}</option>
                        ))}
                      </select>
                    </td>
                  ),
                  warehouse: (
                    <td key="warehouse" className="px-3 py-2">
                      <select value={draft.warehouseId} onChange={(event) => setDraftField(row.id, "warehouseId", event.target.value)} className="w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                        <option value="">No warehouse</option>
                        {warehouseOptions.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                        ))}
                      </select>
                    </td>
                  ),
                  instructions: (
                    <td key="instructions" className="px-3 py-2"><input value={draft.instructions} onChange={(event) => setDraftField(row.id, "instructions", event.target.value)} className="w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  ),
                  padType: (
                    <td key="padType" className="px-3 py-2">
                      <select value={draft.padProductId} onChange={(event) => setDraftField(row.id, "padProductId", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                        <option value="">No pad type</option>
                        {padProductOptions.map((product) => (
                          <option key={product.id} value={product.id}>{product.label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-[var(--foreground)]/60">{row.padTypeLabel || "-"}</p>
                    </td>
                  ),
                  templateNotes: (
                    <td key="templateNotes" className="px-3 py-2"><input value={draft.templateNotes} onChange={(event) => setDraftField(row.id, "templateNotes", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  ),
                  save: (
                    <td key="save" className="px-3 py-2">
                      <SaveRowButton onClick={() => void saveTemplate(row)} disabled={isSavingId === row.id}>
                        {isSavingId === row.id ? "Saving..." : "Save"}
                      </SaveRowButton>
                    </td>
                  ),
                  delete: (
                    <td key="delete" className="px-3 py-2">
                      <DeleteRowButton onClick={() => void deleteTemplate(row.id)} disabled={deletingId === row.id}>
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </DeleteRowButton>
                    </td>
                  ),
                }

                return (
                  <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
                    {visibleTemplateColumns.map((column) => cells[column.key])}
                  </tr>
                )
              })}

              {filteredTemplates.length === 0 ? <TableEmptyRow message="No templates found." colSpan={visibleTemplateColumns.length} /> : null}
            </tbody>
        </TableShell>

      </section>

      {isCreateModalOpen ? (
        <ModalShell title="New Template" onClose={closeCreateTemplate}>
          <div className="space-y-6">
            {message ? <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Template Tag">
                <input value={newDraft.templateTag} onChange={(event) => setNewDraftField("templateTag", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Property">
                <select value={newDraft.propertyId} onChange={(event) => setNewDraftField("propertyId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">Select property</option>
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Warehouse">
                <select value={newDraft.warehouseId} onChange={(event) => setNewDraftField("warehouseId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">No warehouse</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Pad Type">
                <select value={newDraft.padProductId} onChange={(event) => setNewDraftField("padProductId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">No pad type</option>
                  {padProductOptions.map((product) => (
                    <option key={product.id} value={product.id}>{product.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Instructions">
                <textarea value={newDraft.instructions} onChange={(event) => setNewDraftField("instructions", event.target.value)} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
              </FormField>
              <FormField label="Template Notes">
                <textarea value={newDraft.templateNotes} onChange={(event) => setNewDraftField("templateNotes", event.target.value)} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
              </FormField>
            </div>

            <div className="rounded-lg border border-[var(--panel-border)] px-4 py-4 text-sm text-[var(--foreground)]/70">
              Create the template first, then add template items from the opened template form.
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeCreateTemplate} disabled={isSavingNew} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void createTemplate()} disabled={isSavingNew} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isSavingNew ? "Creating..." : "Create Template"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeTemplate ? (
        <ModalShell title={`Template ${activeTemplate.templateTag}`} onClose={closeTemplate}>
          <div className="space-y-6">
            {message ? <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Template Tag">
                <input value={activeTemplateDraft.templateTag} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, templateTag: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Property">
                <select value={activeTemplateDraft.propertyId} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, propertyId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">Select property</option>
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Warehouse">
                <select value={activeTemplateDraft.warehouseId} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, warehouseId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">No warehouse</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Pad Type">
                <select value={activeTemplateDraft.padProductId} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, padProductId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">No pad type</option>
                  {padProductOptions.map((product) => (
                    <option key={product.id} value={product.id}>{product.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Instructions">
                <textarea value={activeTemplateDraft.instructions} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, instructions: event.target.value }))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
              </FormField>
              <FormField label="Template Notes">
                <textarea value={activeTemplateDraft.templateNotes} onChange={(event) => setActiveTemplateDraft((prev) => ({ ...prev, templateNotes: event.target.value }))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
              </FormField>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Template Items</h3>
                <p className="text-sm text-[var(--foreground)]/70">Add the products and quantities this template should carry.</p>
              </div>

              <div className="grid gap-3 rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] md:grid-cols-[minmax(0,1.5fr),120px,160px,minmax(0,1fr),auto] md:items-end">
                <FormField label="Product">
                  <select value={itemDraft.productId} onChange={(event) => setItemDraft((prev) => ({ ...prev, productId: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2">
                    <option value="">Select product</option>
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>{product.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Qty">
                  <input value={itemDraft.quantity} onChange={(event) => setItemDraft((prev) => ({ ...prev, quantity: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
                </FormField>
                <FormField label="Stored Dye Lot">
                  <input value={itemDraft.storedDyeLot} onChange={(event) => setItemDraft((prev) => ({ ...prev, storedDyeLot: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
                </FormField>
                <FormField label="Notes">
                  <input value={itemDraft.notes} onChange={(event) => setItemDraft((prev) => ({ ...prev, notes: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
                </FormField>
                <button type="button" onClick={() => void addTemplateItem()} disabled={isSavingItem} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60">
                  {isSavingItem ? "Adding..." : "Add Item"}
                </button>
              </div>

              <ModalTableShell minWidthClass="min-w-[900px]">
                <ModalTableHead>
                    <tr>
                      <TableHeaderCell>Product</TableHeaderCell>
                      <TableHeaderCell>Qty</TableHeaderCell>
                      <TableHeaderCell>Unit</TableHeaderCell>
                      <TableHeaderCell>Stored Dye Lot</TableHeaderCell>
                      <TableHeaderCell>Notes</TableHeaderCell>
                      <TableHeaderCell>Save</TableHeaderCell>
                      <TableHeaderCell>Delete</TableHeaderCell>
                    </tr>
                </ModalTableHead>
                  <tbody>
                    {loadingItems ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-[var(--foreground)]/70">Loading items...</td>
                      </tr>
                    ) : templateItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-[var(--foreground)]/70">No template items yet.</td>
                      </tr>
                    ) : (
                      templateItems.map((item) => (
                        <tr key={item.id} className="border-t border-[var(--panel-border)]">
                          <td className="px-3 py-2">
                            <select value={item.productId} onChange={(event) => setTemplateItemField(item.id, "productId", event.target.value)} className="w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                              {productOptions.map((product) => (
                                <option key={product.id} value={product.id}>{product.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input value={item.quantity} onChange={(event) => setTemplateItemField(item.id, "quantity", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                          </td>
                          <td className="px-3 py-2">{productOptions.find((product) => product.id === item.productId)?.sendUnit || item.sendUnit || "-"}</td>
                          <td className="px-3 py-2">
                            <input value={item.storedDyeLot} onChange={(event) => setTemplateItemField(item.id, "storedDyeLot", event.target.value)} className="w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                          </td>
                          <td className="px-3 py-2">
                            <input value={item.notes} onChange={(event) => setTemplateItemField(item.id, "notes", event.target.value)} className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                          </td>
                          <td className="px-3 py-2">
                            <SaveRowButton onClick={() => void saveTemplateItem(item)} disabled={savingItemId === item.id}>
                              {savingItemId === item.id ? "Saving..." : "Save"}
                            </SaveRowButton>
                          </td>
                          <td className="px-3 py-2">
                            <DeleteRowButton onClick={() => void deleteTemplateItem(item.id)} disabled={deletingItemId === item.id}>
                              {deletingItemId === item.id ? "Deleting..." : "Delete"}
                            </DeleteRowButton>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
              </ModalTableShell>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeTemplate} disabled={isSavingTemplateModal} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
                Close
              </button>
              <button type="button" onClick={() => void saveActiveTemplate()} disabled={isSavingTemplateModal} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isSavingTemplateModal ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
