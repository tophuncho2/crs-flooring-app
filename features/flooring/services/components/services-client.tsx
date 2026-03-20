"use client"

import { type ReactNode, useState } from "react"
import { Plus } from "lucide-react"
import { BasicRecordPanel } from "../../shared/basic-record-panel"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, EditRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField } from "../../shared/record-form"
import { getSharedFormFieldClass } from "../../shared/form-field-styles"
import { DashboardCardTitle } from "../../shared/dashboard-card-title"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "../../shared/use-table-controls"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table-shell"
import { useConfiguredTableState } from "../../shared/use-configured-table-state"
import { useUrlRecordEditor } from "../../shared/use-url-record-editor"
import { requestJson } from "../../shared/http"

type ServiceRow = {
  id: string
  name: string
  unitId: string
  unitName: string
  baseCost: string
  notes: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

type UnitOption = {
  id: string
  name: string
}

type ServiceForm = {
  name: string
  unitId: string
  baseCost: string
  notes: string
}

const emptyForm: ServiceForm = {
  name: "",
  unitId: "",
  baseCost: "",
  notes: "",
}

function validateServiceForm(input: ServiceForm) {
  if (!input.name.trim()) return "Service name is required"
  if (!input.unitId.trim()) return "Unit is required"
  if (!input.baseCost.trim()) return "Cost is required"
  return ""
}

function createDraft(row: ServiceRow): ServiceForm {
  return {
    name: row.name,
    unitId: row.unitId,
    baseCost: row.baseCost,
    notes: row.notes,
  }
}

export default function ServicesClient({
  initialServices,
  unitOptions,
}: {
  initialServices: ServiceRow[]
  unitOptions: UnitOption[]
}) {
  const [services, setServices] = useState(initialServices)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [panelMessage, setPanelMessage] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [panelError, setPanelError] = useState("")
  const {
    activeRecord: selectedService,
    draft: serviceForm,
    setDraft: setServiceForm,
    openRecord: openServiceRecord,
    closeRecord: closeServiceRecord,
  } = useUrlRecordEditor({
    rows: services,
    paramKey: "service",
    createDraft,
  })

  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    groupByKeys,
    toggleGroupByKey,
    filteredRows,
    sortedRows,
    groupedRowTree,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns,
    visibleColumns,
    hiddenColumnKeys,
    toggleColumnVisibility,
    moveColumn,
    setColumnOrder,
  } = useConfiguredTableState({
    rows: services,
    tableKey: "services-main",
    fields: [
      { key: "edit", label: "Edit", getValue: () => "", searchable: false, groupable: false },
      { key: "name", label: "Service Name", getValue: (row) => row.name, groupable: false },
      { key: "unit", label: "Unit", getValue: (row) => row.unitName, groupable: true },
      { key: "cost", label: "Cost", getValue: (row) => row.baseCost, groupable: false },
      { key: "notes", label: "Notes", getValue: (row) => row.notes, groupable: false },
      { key: "usage", label: "Usage", getValue: (row) => String(row.usageCount), groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.name,
    defaultGroupKeys: ["unit"],
  })

  function clearNotices() {
    setMessage("")
    setError("")
    setPanelMessage("")
    setPanelError("")
  }

  function openCreate() {
    clearNotices()
    setServiceForm(emptyForm)
    setIsCreateOpen(true)
  }

  function openEdit(row: ServiceRow) {
    clearNotices()
    setPanelMessage("")
    setPanelError("")
    openServiceRecord(row)
  }

  function closeEdit() {
    if (isSavingId) return
    closeServiceRecord()
    setPanelMessage("")
    setPanelError("")
  }

  async function createService() {
    clearNotices()
    const validationError = validateServiceForm(serviceForm ?? emptyForm)
    if (validationError) {
      setError(validationError)
      return
    }
    setIsSavingNew(true)
    try {
      const payload = await requestJson<{ service: ServiceRow }>("/api/flooring/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceForm ?? emptyForm),
      })
      setServices((prev) => [payload.service, ...prev].sort((a, b) => a.name.localeCompare(b.name)))
      setIsCreateOpen(false)
      setServiceForm(emptyForm)
      setMessage("Service created")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save service")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function savePanelService() {
    if (!selectedService || !serviceForm) return
    clearNotices()
    const validationError = validateServiceForm(serviceForm)
    if (validationError) {
      setPanelError(validationError)
      return
    }
    setIsSavingId(selectedService.id)
    try {
      const payload = await requestJson<{ service: ServiceRow }>(`/api/flooring/services/${selectedService.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceForm),
      })
      setServices((prev) => prev.map((row) => (row.id === selectedService.id ? payload.service : row)).sort((a, b) => a.name.localeCompare(b.name)))
      openServiceRecord(payload.service)
      setPanelMessage("Service saved")
    } catch (saveError) {
      setPanelError(saveError instanceof Error ? saveError.message : "Failed to save service")
    } finally {
      setIsSavingId(null)
    }
  }

  async function deleteService(row: ServiceRow) {
    if (!window.confirm(`Delete ${row.name}?`)) return
    clearNotices()
    setDeletingId(row.id)
    try {
      await requestJson<{ success?: boolean }>(`/api/flooring/services/${row.id}`, { method: "DELETE" })
      setServices((prev) => prev.filter((item) => item.id !== row.id))
      if (selectedService?.id === row.id) {
        closeServiceRecord()
      }
      setMessage("Service deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete service")
    } finally {
      setDeletingId(null)
    }
  }

  function renderRow(row: ServiceRow) {
    const cells: Record<string, ReactNode> = {
      edit: (
        <td key="edit" className="px-3 py-2">
          <EditRowButton onClick={() => openEdit(row)} />
        </td>
      ),
      name: <td key="name" className="px-3 py-2 font-medium">{row.name}</td>,
      unit: <td key="unit" className="px-3 py-2">{row.unitName || "-"}</td>,
      cost: <td key="cost" className="px-3 py-2">{row.baseCost || "-"}</td>,
      notes: <td key="notes" className="px-3 py-2">{row.notes || "-"}</td>,
      usage: <td key="usage" className="px-3 py-2">{row.usageCount}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => void deleteService(row)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">{visibleColumns.map((column) => cells[column.key])}</tr>
  }

  function renderGroupedRows(groups: GroupedRowTree<ServiceRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${group.fieldLabel}: ${group.label}`} depth={group.depth} colSpan={visibleColumns.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderRow(row))),
    ])
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Services</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search services"
              isAscendingSort={isAscendingSort}
              onToggleSort={() => setIsAscendingSort((prev) => !prev)}
            >
              <TableColumnSettings
                columns={allColumns}
                hiddenColumnKeys={hiddenColumnKeys}
                onToggleColumn={toggleColumnVisibility}
                onMoveColumn={moveColumn}
                onSetColumnOrder={setColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={toggleGroupByKey}
              />
              <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400">
                <Plus size={16} />
                Service
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
        {error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[1080px]">
          <TableHead>
            <tr>
              {visibleColumns.map((column) => (
                <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
              ))}
            </tr>
          </TableHead>
          <tbody>
            {isGroupingEnabled ? renderGroupedRows(groupedRowTree) : sortedRows.map((row) => renderRow(row))}
            {filteredRows.length === 0 ? <TableEmptyRow message="No services yet." colSpan={visibleColumns.length} /> : null}
          </tbody>
        </TableShell>
        <TablePaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
        />
      </div>

      {isCreateOpen ? (
        <BasicRecordPanel
          title="New Service"
          onClose={() => !isSavingNew && setIsCreateOpen(false)}
          message=""
          error={error}
          saveLabel="Create Service"
          savingLabel="Creating..."
          deleteLabel="Delete Service"
          deleteConfirmMessage="Delete this service?"
          onSave={() => void createService()}
          onDelete={() => {}}
          isSaving={isSavingNew}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Service Name">
              <input
                value={serviceForm?.name ?? ""}
                onChange={(event) => setServiceForm((prev) => ({ ...(prev ?? emptyForm), name: event.target.value }))}
                className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: (serviceForm?.name ?? "").trim() === "" })}`}
              />
            </FormField>
            <FormField label="Service Unit">
              <select value={serviceForm?.unitId ?? ""} onChange={(event) => setServiceForm((prev) => ({ ...(prev ?? emptyForm), unitId: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: (serviceForm?.unitId ?? "").trim() === "" })}`}>
                <option value="">Select unit</option>
                {unitOptions.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Cost">
              <input value={serviceForm?.baseCost ?? ""} onChange={(event) => setServiceForm((prev) => ({ ...(prev ?? emptyForm), baseCost: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: (serviceForm?.baseCost ?? "").trim() === "" })}`} />
            </FormField>
            <FormField label="Notes">
              <textarea value={serviceForm?.notes ?? ""} onChange={(event) => setServiceForm((prev) => ({ ...(prev ?? emptyForm), notes: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: (serviceForm?.notes ?? "").trim() === "" })}`} />
            </FormField>
          </div>
        </BasicRecordPanel>
      ) : null}

      {selectedService && serviceForm ? (
        <BasicRecordPanel
          title={`Service ${selectedService.name}`}
          onClose={closeEdit}
          message={panelMessage}
          error={panelError}
          saveLabel="Save Service"
          savingLabel="Saving..."
          deleteLabel="Delete Service"
          deleteConfirmMessage={`Delete ${selectedService.name}?`}
          onSave={() => void savePanelService()}
          onDelete={() => void deleteService(selectedService)}
          isSaving={isSavingId === selectedService.id || deletingId === selectedService.id}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Service Name">
              <input
                value={serviceForm.name}
                onChange={(event) => setServiceForm((prev) => ({ ...(prev ?? emptyForm), name: event.target.value }))}
                className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: serviceForm.name.trim() === "" })}`}
              />
            </FormField>
            <FormField label="Service Unit">
              <select value={serviceForm.unitId} onChange={(event) => setServiceForm((prev) => ({ ...(prev ?? emptyForm), unitId: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: serviceForm.unitId.trim() === "" })}`}>
                <option value="">Select unit</option>
                {unitOptions.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Cost">
              <input value={serviceForm.baseCost} onChange={(event) => setServiceForm((prev) => ({ ...(prev ?? emptyForm), baseCost: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: serviceForm.baseCost.trim() === "" })}`} />
            </FormField>
            <FormField label="Notes">
              <textarea value={serviceForm.notes} onChange={(event) => setServiceForm((prev) => ({ ...(prev ?? emptyForm), notes: event.target.value }))} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: serviceForm.notes.trim() === "" })}`} />
            </FormField>
          </div>
        </BasicRecordPanel>
      ) : null}
    </div>
  )
}
