"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { BasicRecordPanel } from "../../shared/basic-record-panel"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { EditRowButton, DeleteRowButton, SaveRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField } from "../../shared/record-form"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { MAX_GROUP_FIELDS, type GroupedRowTree, useTableControls } from "../../shared/use-table-controls"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "../../shared/table-shell"
import { useTableColumns } from "../../shared/use-table-columns"

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

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Request failed")
  }
  return payload as T
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
  const [drafts, setDrafts] = useState<Record<string, ServiceForm>>({})
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyForm)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [panelMessage, setPanelMessage] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [panelError, setPanelError] = useState("")

  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    updateGroupByKeyAtIndex,
    addGroupByKey,
    removeGroupByKeyAtIndex,
    groupFields,
    filteredRows,
    sortedRows,
    groupedRowTree,
  } = useTableControls({
    rows: services,
    searchFields: [
      { key: "name", getValue: (row) => row.name },
      { key: "unit", getValue: (row) => row.unitName },
      { key: "notes", getValue: (row) => row.notes },
    ],
    sortField: (row) => row.name,
    groupFields: [
      { key: "name", label: "Service", getValue: (row) => row.name },
      { key: "unit", label: "Unit", getValue: (row) => row.unitName },
      { key: "usage", label: "Usage", getValue: (row) => String(row.usageCount) },
    ],
    defaultGroupKeys: ["unit"],
  })

  const columns = useMemo(
    () => [
      { key: "edit", label: "Edit" },
      { key: "name", label: "Service Name" },
      { key: "unit", label: "Unit" },
      { key: "cost", label: "Cost" },
      { key: "notes", label: "Notes" },
      { key: "usage", label: "Usage" },
      { key: "save", label: "Save" },
      { key: "delete", label: "Delete" },
    ],
    [],
  )

  const {
    allColumns,
    visibleColumns,
    hiddenColumnKeys,
    toggleColumnVisibility,
    moveColumn,
    setColumnOrder,
  } = useTableColumns({
    tableKey: "services-main",
    columns,
  })

  function clearNotices() {
    setMessage("")
    setError("")
    setPanelMessage("")
    setPanelError("")
  }

  function getDraft(id: string): ServiceForm {
    return drafts[id] ?? createDraft(services.find((row) => row.id === id)!)
  }

  function setDraftField(id: string, field: keyof ServiceForm, value: string) {
    const base = services.find((row) => row.id === id)
    if (!base) return
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? createDraft(base)),
        [field]: value,
      },
    }))
  }

  function openCreate() {
    clearNotices()
    setServiceForm(emptyForm)
    setIsCreateOpen(true)
  }

  function openEdit(row: ServiceRow) {
    clearNotices()
    setSelectedService(row)
    setPanelMessage("")
    setPanelError("")
    setServiceForm(createDraft(row))
  }

  function closeEdit() {
    if (isSavingId) return
    setSelectedService(null)
    setPanelMessage("")
    setPanelError("")
  }

  async function createService() {
    clearNotices()
    setIsSavingNew(true)
    try {
      const payload = await apiJson<{ service: ServiceRow }>("/api/flooring/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceForm),
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

  async function saveService(row: ServiceRow) {
    clearNotices()
    setIsSavingId(row.id)
    try {
      const payload = await apiJson<{ service: ServiceRow }>(`/api/flooring/services/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getDraft(row.id)),
      })
      setServices((prev) => prev.map((item) => (item.id === row.id ? payload.service : item)).sort((a, b) => a.name.localeCompare(b.name)))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setMessage("Service saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save service")
    } finally {
      setIsSavingId(null)
    }
  }

  async function savePanelService() {
    if (!selectedService) return
    clearNotices()
    setIsSavingId(selectedService.id)
    try {
      const payload = await apiJson<{ service: ServiceRow }>(`/api/flooring/services/${selectedService.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceForm),
      })
      setServices((prev) => prev.map((row) => (row.id === selectedService.id ? payload.service : row)).sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedService(payload.service)
      setServiceForm(createDraft(payload.service))
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
      await apiJson<{ success?: boolean }>(`/api/flooring/services/${row.id}`, { method: "DELETE" })
      setServices((prev) => prev.filter((item) => item.id !== row.id))
      setSelectedService((current) => (current?.id === row.id ? null : current))
      setMessage("Service deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete service")
    } finally {
      setDeletingId(null)
    }
  }

  function renderRow(row: ServiceRow) {
    const draft = getDraft(row.id)
    const cells: Record<string, ReactNode> = {
      edit: (
        <td key="edit" className="px-3 py-2">
          <EditRowButton onClick={() => openEdit(row)} />
        </td>
      ),
      name: (
        <td key="name" className="px-3 py-2">
          <input value={draft.name} onChange={(event) => setDraftField(row.id, "name", event.target.value)} className="w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
        </td>
      ),
      unit: (
        <td key="unit" className="px-3 py-2">
          <select value={draft.unitId} onChange={(event) => setDraftField(row.id, "unitId", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
            <option value="">Select unit</option>
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
        </td>
      ),
      cost: (
        <td key="cost" className="px-3 py-2">
          <input value={draft.baseCost} onChange={(event) => setDraftField(row.id, "baseCost", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
        </td>
      ),
      notes: (
        <td key="notes" className="px-3 py-2">
          <input value={draft.notes} onChange={(event) => setDraftField(row.id, "notes", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
        </td>
      ),
      usage: <td key="usage" className="px-3 py-2">{row.usageCount}</td>,
      save: (
        <td key="save" className="px-3 py-2">
          <SaveRowButton onClick={() => void saveService(row)} disabled={isSavingId === row.id}>
            {isSavingId === row.id ? "Saving..." : "Save"}
          </SaveRowButton>
        </td>
      ),
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
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${groupFields[group.depth]?.label ?? "Group"}: ${group.label}`} depth={group.depth} colSpan={visibleColumns.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderRow(row))),
    ])
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Services</h1>
            <p className="text-sm text-[var(--foreground)]/70">Manage reusable labor and service definitions for templates and work orders.</p>
          </div>
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search services"
              isAscendingSort={isAscendingSort}
              onToggleSort={() => setIsAscendingSort((prev) => !prev)}
              isGroupingEnabled={isGroupingEnabled}
              onToggleGrouping={() => setIsGroupingEnabled((prev) => !prev)}
              groupOptions={groupFields.map((field) => ({ key: field.key, label: field.label }))}
              groupByKeys={groupByKeys}
              onGroupByKeyAtIndexChange={updateGroupByKeyAtIndex}
              onAddGroupBy={addGroupByKey}
              onRemoveGroupBy={removeGroupByKeyAtIndex}
              maxGroupFields={MAX_GROUP_FIELDS}
            >
              <TableColumnSettings
                columns={allColumns}
                hiddenColumnKeys={hiddenColumnKeys}
                onToggleColumn={toggleColumnVisibility}
                onMoveColumn={moveColumn}
                onSetColumnOrder={setColumnOrder}
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
              <input value={serviceForm.name} onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
            <FormField label="Service Unit">
              <select value={serviceForm.unitId} onChange={(event) => setServiceForm((prev) => ({ ...prev, unitId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                <option value="">Select unit</option>
                {unitOptions.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Cost">
              <input value={serviceForm.baseCost} onChange={(event) => setServiceForm((prev) => ({ ...prev, baseCost: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
            <FormField label="Notes">
              <textarea value={serviceForm.notes} onChange={(event) => setServiceForm((prev) => ({ ...prev, notes: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
          </div>
        </BasicRecordPanel>
      ) : null}

      {selectedService ? (
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
              <input value={serviceForm.name} onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
            <FormField label="Service Unit">
              <select value={serviceForm.unitId} onChange={(event) => setServiceForm((prev) => ({ ...prev, unitId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                <option value="">Select unit</option>
                {unitOptions.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Cost">
              <input value={serviceForm.baseCost} onChange={(event) => setServiceForm((prev) => ({ ...prev, baseCost: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
            <FormField label="Notes">
              <textarea value={serviceForm.notes} onChange={(event) => setServiceForm((prev) => ({ ...prev, notes: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </FormField>
          </div>
        </BasicRecordPanel>
      ) : null}
    </div>
  )
}
