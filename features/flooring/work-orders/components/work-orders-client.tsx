"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { WorkOrderRecordPanel } from "./work-order-record-panel"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, OpenRowButton, SaveRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "../../shared/record-form"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "../../shared/table-shell"
import { requestJson } from "../../shared/http"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS, usePrimaryRecordPanel } from "../../shared/primary-record-panel"
import { RecordLineSummary } from "../../shared/record-line-summary"
import { RecordOptionsMenu } from "../../shared/record-options-menu"
import { useTableColumns } from "../../shared/use-table-columns"
import { MAX_GROUP_FIELDS, type GroupedRowTree, useTableControls } from "../../shared/use-table-controls"
import type { MaterialItemOption } from "../../shared/material-items-editor"
import type { ServiceOption, UnitOption } from "../../shared/service-items-editor"

type WorkOrderRow = {
  id: string
  workOrderNumber: string
  propertyId: string
  propertyName: string
  propertyAddress: string
  warehouseId: string
  warehouseName: string
  status: string
  statusLabel: string
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | null
  date: string | null
  unitText: string
  unitNumber: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
  itemsCount: number
  createdAt: string
  updatedAt: string
}

type PropertyOption = {
  id: string
  name: string
  address: string
}

type WarehouseOption = {
  id: string
  name: string
}

type ProductOption = MaterialItemOption

type TemplateOption = {
  id: string
  propertyId: string
  label: string
}

type DraftWorkOrder = {
  propertyId: string
  warehouseId: string
  status: string
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | ""
  date: string
  unitText: string
  unitNumber: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
}

const statusOptions = [
  "BUILDING_ORDER",
  "PENDING_EXPORT",
  "CARPET_CLEANING",
  "SENT_OUT",
]

const statusLabelByValue: Record<string, string> = {
  BUILDING_ORDER: "Building Order",
  PENDING_EXPORT: "Pending Export",
  CARPET_CLEANING: "Carpet Cleaning",
  SENT_OUT: "Sent Out",
}

const vacancyOptions: Array<"VACANT" | "OCCUPIED"> = ["VACANT", "OCCUPIED"]

function statusLabel(value: string) {
  return statusLabelByValue[value] ?? value
}

function workOrderStatusText(row: Pick<WorkOrderRow, "status" | "isComplete">) {
  return row.isComplete ? "Complete" : statusLabel(row.status)
}

function statusFieldClass(value: string) {
  if (value === "BUILDING_ORDER") return "border-amber-500/40 bg-amber-500/10 text-amber-700"
  if (value === "PENDING_EXPORT") return "border-sky-500/40 bg-sky-500/10 text-sky-700"
  if (value === "CARPET_CLEANING") return "border-violet-500/40 bg-violet-500/10 text-violet-700"
  if (value === "SENT_OUT") return "border-orange-500/40 bg-orange-500/10 text-orange-700"
  return "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]"
}

function vacancyFieldClass(value: string) {
  if (value === "OCCUPIED") return "border-yellow-500/40 bg-yellow-500/10 text-yellow-700"
  if (value === "VACANT") return "border-lime-400/40 bg-lime-400/10 text-lime-700"
  return "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]"
}

function dateInputValue(value: string | null) {
  if (!value) return ""
  return value.split("T")[0]
}

function buildWorkOrderAddress(property: PropertyOption | undefined, customAddress: string) {
  if (customAddress.trim()) return customAddress
  return property?.address ?? ""
}

const defaultDraft: DraftWorkOrder = {
  propertyId: "",
  warehouseId: "",
  status: "BUILDING_ORDER",
  isComplete: false,
  vacancy: "",
  date: "",
  unitText: "",
  unitNumber: "",
  unitType: "",
  customAddress: "",
  instructions: "",
  notes: "",
  workOrderImageUrl: "",
}

export default function WorkOrdersClient({
  initialWorkOrders,
  propertyOptions,
  warehouseOptions,
  productOptions,
  templateOptions,
  serviceOptions,
  unitOptions,
}: {
  initialWorkOrders: WorkOrderRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  productOptions: ProductOption[]
  templateOptions: TemplateOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
}) {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>(initialWorkOrders)
  const [drafts, setDrafts] = useState<Record<string, DraftWorkOrder>>({})
  const [newDraft, setNewDraft] = useState<DraftWorkOrder>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeWorkOrderSummary, setActiveWorkOrderSummary] = useState<{ materialItems: Array<{ quantity: string; unitPrice: string }>; serviceItems: Array<{ quantity: string; unitPrice: string }> }>({
    materialItems: [],
    serviceItems: [],
  })
  const [isWorkOrderSyncOpen, setIsWorkOrderSyncOpen] = useState(false)
  const [workOrderRefreshNonce, setWorkOrderRefreshNonce] = useState(0)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const { activeRecordId: activeWorkOrderId, openRecord: openWorkOrderPanel, closeRecord: closeWorkOrderPanel } = usePrimaryRecordPanel("workOrder")

  const propertyLookup = useMemo(() => new Map(propertyOptions.map((property) => [property.id, property])), [propertyOptions])
  const activeWorkOrder = workOrders.find((row) => row.id === activeWorkOrderId) ?? null
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
    filteredRows: filteredWorkOrders,
    sortedRows: sortedWorkOrders,
    groupedRowTree: groupedWorkOrders,
  } = useTableControls({
    rows: workOrders,
    searchFields: [{ key: "property", getValue: (row) => row.propertyName }],
    sortField: (row) => row.workOrderNumber,
    groupFields: [
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName },
      { key: "property", label: "Property", getValue: (row) => row.propertyName },
      { key: "date", label: "Date", getValue: (row) => (row.date ? row.date.split("T")[0] : "No Date") },
      { key: "status", label: "Status", getValue: (row) => workOrderStatusText(row) },
    ],
    defaultGroupKeys: ["warehouse"],
  })
  const workOrderColumns = useMemo(
    () => [
      { key: "wo", label: "WO" },
      { key: "open", label: "Open" },
      { key: "status", label: "Status" },
      { key: "warehouse", label: "Warehouse" },
      { key: "property", label: "Property" },
      { key: "address", label: "Address" },
      { key: "customAddress", label: "Custom Address" },
      { key: "date", label: "Date" },
      { key: "unit", label: "Unit" },
      { key: "unitType", label: "Unit Type" },
      { key: "vacancy", label: "Vacancy" },
      { key: "instructions", label: "Instructions" },
      { key: "notes", label: "Notes" },
      { key: "imageUrl", label: "Image URL" },
      { key: "items", label: "Items" },
      { key: "save", label: "Save" },
      { key: "delete", label: "Delete" },
    ],
    [],
  )
  const {
    allColumns: orderedWorkOrderColumns,
    visibleColumns: visibleWorkOrderColumns,
    hiddenColumnKeys: hiddenWorkOrderColumnKeys,
    toggleColumnVisibility: toggleWorkOrderColumnVisibility,
    moveColumn: moveWorkOrderColumn,
    setColumnOrder: setWorkOrderColumnOrder,
  } = useTableColumns({
    tableKey: "work-orders-main",
    columns: workOrderColumns,
  })

  function getDraft(id: string): DraftWorkOrder {
    const row = workOrders.find((order) => order.id === id)
    if (!row) return defaultDraft

    return (
      drafts[id] ?? {
        propertyId: row.propertyId,
        warehouseId: row.warehouseId,
        status: row.status,
        isComplete: row.isComplete,
        vacancy: row.vacancy ?? "",
        date: dateInputValue(row.date),
        unitText: row.unitText,
        unitNumber: row.unitNumber,
        unitType: row.unitType,
        customAddress: row.customAddress,
        instructions: row.instructions,
        notes: row.notes,
        workOrderImageUrl: row.workOrderImageUrl,
      }
    )
  }

  function setDraftField(id: string, field: keyof DraftWorkOrder, value: string) {
    const base = getDraft(id)
    setDrafts((prev) => ({ ...prev, [id]: { ...base, ...prev[id], [field]: value } }))
  }

  function setNewDraftField(field: keyof DraftWorkOrder, value: string) {
    setNewDraft((prev) => ({ ...prev, [field]: value }))
  }

  function formatRow(row: WorkOrderRow) {
    return {
      displayOrder: row.workOrderNumber,
      displayAddress: buildWorkOrderAddress(propertyLookup.get(row.propertyId), row.customAddress),
    }
  }

  async function openWorkOrder(row: WorkOrderRow) {
    setMessage("")
    setError("")
    openWorkOrderPanel(row.id)
  }

  function closeWorkOrder() {
    setActiveWorkOrderSummary({ materialItems: [], serviceItems: [] })
    setIsWorkOrderSyncOpen(false)
    closeWorkOrderPanel()
  }

  async function markWorkOrderComplete() {
    if (!activeWorkOrder || activeWorkOrder.isComplete) return
    if (!window.confirm("Mark this work order complete?")) return

    setError("")
    setMessage("")

    try {
      const payload = await requestJson<{ workOrder?: WorkOrderRow }>(`/api/flooring/work-orders/${activeWorkOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete: true }),
      })
      if (!payload.workOrder) throw new Error("Failed to complete work order")

      setWorkOrders((prev) => prev.map((row) => (row.id === payload.workOrder!.id ? payload.workOrder! : row)))
      setIsWorkOrderSyncOpen(false)
      setWorkOrderRefreshNonce((current) => current + 1)
      setMessage("Work order marked complete")
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Failed to complete work order")
    }
  }

  function selectedAddress(draft: DraftWorkOrder) {
    return buildWorkOrderAddress(propertyLookup.get(draft.propertyId), draft.customAddress)
  }

  async function persistWorkOrder(id: string, draft: DraftWorkOrder) {
    const payload = await requestJson<{
      workOrder?: WorkOrderRow
    }>(`/api/flooring/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })
    if (!payload.workOrder) throw new Error("Failed to save work order")

    return payload.workOrder
  }

  async function saveWorkOrder(row: WorkOrderRow) {
    setError("")
    setMessage("")
    setIsSaving(row.id)

    try {
      const savedWorkOrder = await persistWorkOrder(row.id, getDraft(row.id))
      setWorkOrders((prev) => prev.map((item) => (item.id === row.id ? savedWorkOrder : item)))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setMessage("Work order saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save work order")
    } finally {
      setIsSaving(null)
    }
  }

  async function createWorkOrder() {
    setIsSavingNew(true)
    setMessage("")
    setError("")

    try {
      if (!newDraft.propertyId) {
        throw new Error("Property is required")
      }

      const payload = await requestJson<{
        workOrder?: WorkOrderRow
      }>("/api/flooring/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      })
      if (!payload.workOrder) throw new Error("Failed to create work order")

      const createdWorkOrder = payload.workOrder
      const property = propertyLookup.get(createdWorkOrder.propertyId)

      setWorkOrders((prev) => {
        return [
          {
            ...createdWorkOrder,
            propertyName: property?.name ?? createdWorkOrder.propertyName,
            propertyAddress: buildWorkOrderAddress(property, createdWorkOrder.customAddress),
            warehouseName: warehouseOptions.find((item) => item.id === createdWorkOrder.warehouseId)?.name ?? "",
          },
          ...prev,
        ]
      })
      setIsCreateModalOpen(false)
      setNewDraft(defaultDraft)
      setMessage("Work order created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create work order")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function deleteWorkOrder(id: string) {
    setError("")
    setMessage("")
    setDeletingId(id)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/work-orders/${id}`, {
        method: "DELETE",
      })

      setWorkOrders((prev) => prev.filter((row) => row.id !== id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      if (activeWorkOrderId === id) {
        closeWorkOrderPanel()
      }
      setMessage("Work order deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete work order")
    } finally {
      setDeletingId(null)
    }
  }

  function renderWorkOrderRow(row: WorkOrderRow) {
    const line = formatRow(row)
    const draft = getDraft(row.id)
    const cells: Record<string, ReactNode> = {
      wo: <td key="wo" className="px-3 py-2 font-medium text-blue-500">{line.displayOrder}</td>,
      open: (
        <td key="open" className="px-3 py-2">
          <OpenRowButton onClick={() => void openWorkOrder(row)} className="px-2 py-1" />
        </td>
      ),
      status: (
        <td key="status" className="px-3 py-2">
          {row.isComplete ? (
            <span className="inline-flex min-w-[110px] rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-center text-sm text-emerald-700">
              Complete
            </span>
          ) : (
            <select value={draft.status} onChange={(event) => setDraftField(row.id, "status", event.target.value)} className={`w-44 rounded border px-2 py-1 ${statusFieldClass(draft.status)}`}>
              {statusOptions.map((value) => (
                <option key={value} value={value}>{statusLabel(value)}</option>
              ))}
            </select>
          )}
        </td>
      ),
      warehouse: (
        <td key="warehouse" className="px-3 py-2">
          <select value={draft.warehouseId} onChange={(event) => setDraftField(row.id, "warehouseId", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
            <option value="">No warehouse</option>
            {warehouseOptions.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>
        </td>
      ),
      property: (
        <td key="property" className="px-3 py-2">
          <select value={draft.propertyId} onChange={(event) => setDraftField(row.id, "propertyId", event.target.value)} className="w-60 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
            <option value="">Select Property</option>
            {propertyOptions.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
        </td>
      ),
      address: <td key="address" className="px-3 py-2">{line.displayAddress}</td>,
      customAddress: <td key="customAddress" className="px-3 py-2"><input value={draft.customAddress} onChange={(event) => setDraftField(row.id, "customAddress", event.target.value)} className="w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>,
      date: <td key="date" className="px-3 py-2"><input type="date" value={draft.date} onChange={(event) => setDraftField(row.id, "date", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>,
      unit: (
        <td key="unit" className="px-3 py-2">
          <div className="flex gap-1">
            <input value={draft.unitText} onChange={(event) => setDraftField(row.id, "unitText", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
            <input value={draft.unitNumber} onChange={(event) => setDraftField(row.id, "unitNumber", event.target.value)} className="w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
          </div>
        </td>
      ),
      unitType: <td key="unitType" className="px-3 py-2"><input value={draft.unitType} onChange={(event) => setDraftField(row.id, "unitType", event.target.value)} className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>,
      vacancy: (
        <td key="vacancy" className="px-3 py-2">
          <select value={draft.vacancy} onChange={(event) => setDraftField(row.id, "vacancy", event.target.value)} className={`w-28 rounded border px-2 py-1 ${vacancyFieldClass(draft.vacancy)}`}>
            <option value="">Select</option>
            {vacancyOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </td>
      ),
      instructions: <td key="instructions" className="px-3 py-2"><textarea value={draft.instructions} onChange={(event) => setDraftField(row.id, "instructions", event.target.value)} className="min-h-[80px] w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>,
      notes: <td key="notes" className="px-3 py-2"><textarea value={draft.notes} onChange={(event) => setDraftField(row.id, "notes", event.target.value)} className="min-h-[80px] w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>,
      imageUrl: <td key="imageUrl" className="px-3 py-2"><input value={draft.workOrderImageUrl} onChange={(event) => setDraftField(row.id, "workOrderImageUrl", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>,
      items: <td key="items" className="px-3 py-2">{row.itemsCount}</td>,
      save: (
        <td key="save" className="px-3 py-2">
          <SaveRowButton onClick={() => void saveWorkOrder(row)} disabled={isSaving === row.id} className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10">
            {isSaving === row.id ? "Saving..." : "Save"}
          </SaveRowButton>
        </td>
      ),
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => void deleteWorkOrder(row.id)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return (
      <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
        {visibleWorkOrderColumns.map((column) => cells[column.key])}
      </tr>
    )
  }

  function renderGroupedWorkOrders(groups: GroupedRowTree<WorkOrderRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow
        key={`${group.depth}-${group.key}`}
        label={`${groupFields[group.depth]?.label ?? "Group"}: ${group.label}`}
        depth={group.depth}
        colSpan={visibleWorkOrderColumns.length}
      />,
      ...(group.children.length > 0 ? renderGroupedWorkOrders(group.children) : group.rows.map((row) => renderWorkOrderRow(row))),
    ])
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="w-full space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-blue-500">Work Orders</h1>
              <p className="mt-1 text-sm text-[var(--foreground)]/70">Create and manage work orders for flooring operations.</p>
            </div>
            <TableActionsSummary count={filteredWorkOrders.length}>
              <TableControlsBar
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchPlaceholder="Search property"
                isAscendingSort={isAscendingSort}
                onToggleSort={() => setIsAscendingSort((prev) => !prev)}
                ascendingSortLabel="1-9"
                descendingSortLabel="9-1"
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
                  columns={orderedWorkOrderColumns}
                  hiddenColumnKeys={hiddenWorkOrderColumnKeys}
                  onToggleColumn={toggleWorkOrderColumnVisibility}
                  onMoveColumn={moveWorkOrderColumn}
                  onSetColumnOrder={setWorkOrderColumnOrder}
                />
                <button
                  type="button"
                  onClick={() => {
                    setMessage("")
                    setError("")
                    setNewDraft(defaultDraft)
                    setIsCreateModalOpen(true)
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400"
                >
                  <Plus size={16} />
                  Work Order
                </button>
              </TableControlsBar>
            </TableActionsSummary>
          </div>

          {message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
          {error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

          <TableShell minWidthClass="min-w-[1280px]">
              <TableHead>
                <tr>
                  {visibleWorkOrderColumns.map((column) => (
                    <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
                  ))}
                </tr>
              </TableHead>
              <tbody>
                {isGroupingEnabled
                  ? renderGroupedWorkOrders(groupedWorkOrders)
                  : sortedWorkOrders.map((row) => renderWorkOrderRow(row))}

                {filteredWorkOrders.length === 0 ? <TableEmptyRow message="No work orders yet." colSpan={visibleWorkOrderColumns.length} /> : null}
              </tbody>
          </TableShell>
        </section>
      </div>

      {isCreateModalOpen && (
        <ModalShell title="New Work Order" onClose={() => !isSavingNew && setIsCreateModalOpen(false)}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Property">
                <select value={newDraft.propertyId} onChange={(event) => setNewDraftField("propertyId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">Select Property</option>
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Warehouse">
                <select value={newDraft.warehouseId} onChange={(event) => setNewDraftField("warehouseId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">Select Warehouse</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select value={newDraft.status} onChange={(event) => setNewDraftField("status", event.target.value)} className={`rounded border px-3 py-2 ${statusFieldClass(newDraft.status)}`}>
                  {statusOptions.map((value) => (
                    <option key={value} value={value}>{statusLabel(value)}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Vacancy">
                <select value={newDraft.vacancy} onChange={(event) => setNewDraftField("vacancy", event.target.value)} className={`rounded border px-3 py-2 ${vacancyFieldClass(newDraft.vacancy)}`}>
                  <option value="">Select</option>
                  {vacancyOptions.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Address">
                <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
                  {selectedAddress(newDraft) || "Select a property or enter a custom address"}
                </div>
              </FormField>
              <FormField label="Custom Address">
                <input value={newDraft.customAddress} onChange={(event) => setNewDraftField("customAddress", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Date">
                <input type="date" value={newDraft.date} onChange={(event) => setNewDraftField("date", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Unit Type">
                <input value={newDraft.unitType} onChange={(event) => setNewDraftField("unitType", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Unit Label">
                <input value={newDraft.unitText} onChange={(event) => setNewDraftField("unitText", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Unit Number">
                <input value={newDraft.unitNumber} onChange={(event) => setNewDraftField("unitNumber", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Image URL">
                <input value={newDraft.workOrderImageUrl} onChange={(event) => setNewDraftField("workOrderImageUrl", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <FormField label="Instructions">
                <textarea value={newDraft.instructions} onChange={(event) => setNewDraftField("instructions", event.target.value)} className="h-28 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Notes">
                <textarea value={newDraft.notes} onChange={(event) => setNewDraftField("notes", event.target.value)} className="h-28 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
            </div>

            <div className="rounded-lg border border-[var(--panel-border)] px-4 py-4 text-sm text-[var(--foreground)]/70">
              Work order items are added after the row is created by opening that work order from the table.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} disabled={isSavingNew} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={() => void createWorkOrder()} disabled={isSavingNew} className="rounded border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-600 hover:bg-blue-500/20 disabled:opacity-60">
                {isSavingNew ? "Creating..." : "Create Work Order"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {activeWorkOrder ? (
        <ModalShell
          title={`Work Order ${activeWorkOrder.workOrderNumber}`}
          onClose={closeWorkOrder}
          sizeClass={PRIMARY_RECORD_PANEL_WIDTH_CLASS}
          headerMeta={<RecordLineSummary materialItems={activeWorkOrderSummary.materialItems} serviceItems={activeWorkOrderSummary.serviceItems} variant="header" />}
          headerActions={
            <RecordOptionsMenu
              items={[
                {
                  label: "Sync Template",
                  onSelect: () => setIsWorkOrderSyncOpen(true),
                  disabled: !activeWorkOrder.propertyId || activeWorkOrder.isComplete,
                },
                {
                  label: "Complete",
                  onSelect: () => void markWorkOrderComplete(),
                  disabled: activeWorkOrder.isComplete,
                },
                {
                  label: "Invoice",
                  disabled: true,
                },
              ]}
            />
          }
        >
          <WorkOrderRecordPanel
            workOrderId={activeWorkOrder.id}
            propertyOptions={propertyOptions}
            warehouseOptions={warehouseOptions}
            productOptions={productOptions}
            templateOptions={templateOptions}
            serviceOptions={serviceOptions}
            unitOptions={unitOptions}
            onClose={closeWorkOrder}
            isSyncModalOpen={isWorkOrderSyncOpen}
            onCloseSync={() => setIsWorkOrderSyncOpen(false)}
            refreshNonce={workOrderRefreshNonce}
            onSummaryChange={setActiveWorkOrderSummary}
            onWorkOrderSaved={(savedWorkOrder) => {
              setWorkOrders((prev) =>
                prev.map((row) =>
                  row.id === savedWorkOrder.id
                    ? {
                        ...row,
                        ...savedWorkOrder,
                      }
                    : row,
                ),
              )
            }}
            onWorkOrderDeleted={(deletedId) => {
              setWorkOrders((prev) => prev.filter((row) => row.id !== deletedId))
            }}
          />
        </ModalShell>
      ) : null}
    </div>
  )
}
