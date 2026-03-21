"use client"

import { type ReactNode, useState } from "react"
import { Plus } from "lucide-react"
import { TemplateRecordModal } from "./template-record-modal"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "../../shared/dashboard-card-title"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, EditRowButton, OpenRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "../../shared/record-form"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table-shell"
import { requestJson } from "../../shared/http"
import { confirmRecordDelete } from "../../shared/record-panel-footer"
import { usePrimaryRecordPanel } from "../../shared/primary-record-panel"
import { useConfiguredTableState } from "../../shared/use-configured-table-state"
import { useServerTableQueryControls } from "../../shared/use-server-table-query-controls"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "../../shared/use-table-controls"
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

type ServerPaginationState = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  previousPageHref: string
  nextPageHref: string
}

type ServerTableState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
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
  tableState,
  pagination,
}: {
  initialTemplates: TemplateRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  productOptions: ProductOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const [templates, setTemplates] = useState<TemplateRow[]>(initialTemplates)
  const [newDraft, setNewDraft] = useState<DraftTemplate>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
    groupByKeys,
    setGroupByKeys,
    groupFields,
    filteredRows: filteredTemplates,
    sortedRows: sortedTemplates,
    groupedRowTree: groupedTemplates,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns: orderedTemplateColumns,
    visibleColumns: visibleTemplateColumns,
    hiddenColumnKeys: hiddenTemplateColumnKeys,
    toggleColumnVisibility: toggleTemplateColumnVisibility,
    moveColumn: moveTemplateColumn,
    setColumnOrder: setTemplateColumnOrder,
  } = useConfiguredTableState({
    rows: templates,
    tableKey: "templates-main",
    fields: [
      { key: "edit", label: "Edit", getValue: () => "", searchable: false, groupable: false },
      { key: "open", label: "Open", getValue: () => "", searchable: false, groupable: false },
      { key: "templateNumber", label: "Template #", getValue: (row) => row.templateNumber, groupable: false },
      { key: "templateTag", label: "Template Tag", getValue: (row) => row.templateTag, groupable: true },
      { key: "property", label: "Property", getValue: (row) => row.propertyName, groupable: true },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName, groupable: true },
      { key: "instructions", label: "Instructions", getValue: (row) => row.instructions, groupable: false },
      { key: "padType", label: "Pad Type", getValue: (row) => row.padTypeLabel, groupable: true },
      { key: "templateNotes", label: "Template Notes", getValue: (row) => row.templateNotes, groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => `${row.propertyName} ${row.templateTag}`,
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })
  const templateGroupOptions = groupFields.map((field) => ({ key: field.key, label: field.label }))
  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupOptions: templateGroupOptions,
  })

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
    closeTemplatePanel()
  }

  function renderTemplateRow(row: TemplateRow) {
    const cells: Record<string, ReactNode> = {
      edit: (
        <td key="edit" className="px-3 py-2">
          <EditRowButton onClick={() => void openTemplate(row)} />
        </td>
      ),
      open: (
        <td key="open" className="px-3 py-2">
          <OpenRowButton onClick={() => void openTemplate(row)}>Open</OpenRowButton>
        </td>
      ),
      templateNumber: <td key="templateNumber" className="px-3 py-2 font-medium text-blue-500">{row.templateNumber}</td>,
      templateTag: <td key="templateTag" className="px-3 py-2">{row.templateTag}</td>,
      property: <td key="property" className="px-3 py-2">{row.propertyName}</td>,
      warehouse: <td key="warehouse" className="px-3 py-2">{row.warehouseName || "-"}</td>,
      instructions: <td key="instructions" className="px-3 py-2">{row.instructions || "-"}</td>,
      padType: <td key="padType" className="px-3 py-2">{row.padTypeLabel || "-"}</td>,
      templateNotes: <td key="templateNotes" className="px-3 py-2">{row.templateNotes || "-"}</td>,
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
  }

  function renderGroupedRows(groups: GroupedRowTree<TemplateRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow
        key={`${group.depth}-${group.key}`}
        label={`${group.fieldLabel}: ${group.label}`}
        depth={group.depth}
        colSpan={visibleTemplateColumns.length}
      />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderTemplateRow(row))),
    ])
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

  async function deleteTemplate(id: string) {
    if (!confirmRecordDelete("Delete this template? This cannot be undone.")) {
      return
    }
    setError("")
    setMessage("")
    setDeletingId(id)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/templates/${id}`, { method: "DELETE" })

      setTemplates((prev) => prev.filter((template) => template.id !== id))
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
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Templates</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredTemplates.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={serverTableControls.onSearchQueryChange}
              searchPlaceholder="Search property"
              isAscendingSort={isAscendingSort}
              onToggleSort={serverTableControls.onToggleSort}
            >
              <TableColumnSettings
                columns={orderedTemplateColumns}
                hiddenColumnKeys={hiddenTemplateColumnKeys}
                onToggleColumn={toggleTemplateColumnVisibility}
                onMoveColumn={moveTemplateColumn}
                onSetColumnOrder={setTemplateColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={serverTableControls.onToggleGroupByKey}
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
              {isGroupingEnabled ? renderGroupedRows(groupedTemplates) : sortedTemplates.map((row) => renderTemplateRow(row))}

              {filteredTemplates.length === 0 ? <TableEmptyRow message="No templates found." colSpan={visibleTemplateColumns.length} /> : null}
            </tbody>
        </TableShell>
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredTemplates.length}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : goToPreviousPage}
          onNextPage={pagination ? undefined : goToNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />

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
        <TemplateRecordModal
          template={activeTemplate}
          propertyOptions={propertyOptions}
          warehouseOptions={warehouseOptions}
          padProductOptions={padProductOptions}
          productOptions={productOptions}
          serviceOptions={serviceOptions}
          unitOptions={unitOptions}
          onClose={closeTemplate}
          onTemplateSaved={(template) => {
            setTemplates((prev) => prev.map((row) => (row.id === template.id ? template : row)))
          }}
          onTemplateDeleted={(templateId) => {
            setTemplates((prev) => prev.filter((row) => row.id !== templateId))
          }}
        />
      ) : null}
    </div>
  )
}
