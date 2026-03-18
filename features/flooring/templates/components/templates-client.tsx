"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { TemplateRecordPanel } from "./template-record-panel"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, OpenRowButton, SaveRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "../../shared/record-form"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "../../shared/table-shell"
import { requestJson } from "../../shared/http"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS, usePrimaryRecordPanel } from "../../shared/primary-record-panel"
import { RecordLineSummary } from "../../shared/record-line-summary"
import { useTableColumns } from "../../shared/use-table-columns"
import { useTableControls } from "../../shared/use-table-controls"
import type { ServiceOption, UnitOption } from "../../shared/service-items-editor"

type TemplateRow = {
  id: string
  templateNumber: string
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
  productOptions,
  serviceOptions,
  unitOptions,
}: {
  initialTemplates: TemplateRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  productOptions: ProductOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
}) {
  const [templates, setTemplates] = useState<TemplateRow[]>(initialTemplates)
  const [drafts, setDrafts] = useState<Record<string, DraftTemplate>>({})
  const [newDraft, setNewDraft] = useState<DraftTemplate>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTemplateSummary, setActiveTemplateSummary] = useState<{ materialItems: Array<{ quantity: string; unitPrice: string }>; serviceItems: Array<{ quantity: string; unitPrice: string }> }>({
    materialItems: [],
    serviceItems: [],
  })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const { activeRecordId: activeTemplateId, openRecord: openTemplatePanel, closeRecord: closeTemplatePanel } = usePrimaryRecordPanel("template")

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
      { key: "templateNumber", label: "Template #" },
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

  async function openTemplate(row: TemplateRow) {
    setMessage("")
    setError("")
    openTemplatePanel(row.id)
  }

  function closeTemplate() {
    setActiveTemplateSummary({ materialItems: [], serviceItems: [] })
    closeTemplatePanel()
  }

  async function createTemplate() {
    setError("")
    setMessage("")
    setIsSavingNew(true)

    try {
      if (!newDraft.propertyId) throw new Error("Property is required")
      if (!newDraft.templateTag.trim()) throw new Error("Template tag is required")

      const payload = await requestJson<{
        template?: TemplateRow
      }>("/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDraft,
          warehouseId: newDraft.warehouseId || null,
          padProductId: newDraft.padProductId || null,
        }),
      })
      if (!payload.template) throw new Error("Failed to create template")

      setTemplates((prev) => [payload.template!, ...prev])
      setNewDraft(defaultDraft)
      setIsCreateModalOpen(false)
      openTemplatePanel(payload.template.id)
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
      const payload = await requestJson<{
        template?: TemplateRow
      }>(`/api/flooring/templates/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          warehouseId: draft.warehouseId || null,
          padProductId: draft.padProductId || null,
        }),
      })
      if (!payload.template) throw new Error("Failed to save template")

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
      await requestJson<{ ok: boolean }>(`/api/flooring/templates/${id}`, { method: "DELETE" })

      setTemplates((prev) => prev.filter((template) => template.id !== id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      if (activeTemplateId === id) {
        closeTemplatePanel()
      }
      setMessage("Template deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete template")
    } finally {
      setDeletingId(null)
    }
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
                  templateNumber: <td key="templateNumber" className="px-3 py-2 font-medium text-blue-500">{row.templateNumber}</td>,
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
        <ModalShell
          title={`Template ${activeTemplate.templateNumber}`}
          onClose={closeTemplate}
          sizeClass={PRIMARY_RECORD_PANEL_WIDTH_CLASS}
          headerMeta={<RecordLineSummary materialItems={activeTemplateSummary.materialItems} serviceItems={activeTemplateSummary.serviceItems} variant="header" />}
        >
          <TemplateRecordPanel
            templateId={activeTemplate.id}
            initialTemplate={activeTemplate}
            propertyOptions={propertyOptions}
            warehouseOptions={warehouseOptions}
            padProductOptions={padProductOptions}
            productOptions={productOptions}
            serviceOptions={serviceOptions}
            unitOptions={unitOptions}
            onClose={closeTemplate}
            onSummaryChange={setActiveTemplateSummary}
            onTemplateSaved={(template) => {
              setTemplates((prev) => prev.map((row) => (row.id === template.id ? template : row)))
            }}
            onTemplateDeleted={(templateId) => {
              setTemplates((prev) => prev.filter((row) => row.id !== templateId))
            }}
          />
        </ModalShell>
      ) : null}
    </div>
  )
}
