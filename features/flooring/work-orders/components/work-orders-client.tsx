"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { WorkOrderRecordPanel } from "./work-order-record-panel"
import { ErrorNotice, SuccessNotice } from "../../shared/notices"
import { DeleteRowButton, EditRowButton, OpenRowButton } from "../../shared/row-action-buttons"
import { RecordFormField as FormField, RecordModalShell as ModalShell } from "../../shared/record-form"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table-shell"
import { requestJson } from "../../shared/http"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS, usePrimaryRecordPanel } from "../../shared/primary-record-panel"
import { RecordLineSummary } from "../../shared/record-line-summary"
import { RecordOptionsMenu } from "../../shared/record-options-menu"
import { useConfiguredTableState } from "../../shared/use-configured-table-state"
import { useServerTableQueryControls } from "../../shared/use-server-table-query-controls"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "../../shared/use-table-controls"
import type { MaterialItemOption } from "../../shared/material-items-editor"
import type { ServiceOption, UnitOption } from "../../shared/service-items-editor"
import {
  VACANCY_OPTIONS,
  WORK_ORDER_STATUS_OPTIONS,
  getVacancyFieldClass,
  getWorkOrderStatusFieldClass,
  getWorkOrderStatusLabel,
} from "../contracts"

type WorkOrderRow = {
  id: string
  workOrderNumber: string
  propertyId: string
  templateId: string
  propertyName: string
  propertyAddress: string
  warehouseId: string
  warehouseName: string
  status: string
  statusLabel: string
  isComplete: boolean
  hasShortage?: boolean
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
  templateId: string
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

function statusLabel(value: string) {
  return getWorkOrderStatusLabel({ status: value, isComplete: false })
}

function workOrderStatusText(row: Pick<WorkOrderRow, "status" | "isComplete" | "hasShortage">) {
  return getWorkOrderStatusLabel(row)
}

function buildWorkOrderAddress(property: PropertyOption | undefined, customAddress: string) {
  if (customAddress.trim()) return customAddress
  return property?.address ?? ""
}

const defaultDraft: DraftWorkOrder = {
  propertyId: "",
  templateId: "",
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
  tableState,
  pagination,
}: {
  initialWorkOrders: WorkOrderRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  productOptions: ProductOption[]
  templateOptions: TemplateOption[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>(initialWorkOrders)
  const [newDraft, setNewDraft] = useState<DraftWorkOrder>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [syncPropertyId, setSyncPropertyId] = useState("")
  const [syncTemplateSearch, setSyncTemplateSearch] = useState("")
  const [selectedSyncTemplateId, setSelectedSyncTemplateId] = useState("")
  const [isSyncCreateModalOpen, setIsSyncCreateModalOpen] = useState(false)
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeWorkOrderSummary, setActiveWorkOrderSummary] = useState<{ materialItems: Array<{ quantity: string; unitPrice: string }>; serviceItems: Array<{ quantity: string; unitPrice: string }> }>({
    materialItems: [],
    serviceItems: [],
  })
  const [workOrderRefreshNonce, setWorkOrderRefreshNonce] = useState(0)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const { activeRecordId: activeWorkOrderId, openRecord: openWorkOrderPanel, closeRecord: closeWorkOrderPanel } = usePrimaryRecordPanel("workOrder")

  const propertyLookup = useMemo(() => new Map(propertyOptions.map((property) => [property.id, property])), [propertyOptions])
  const warehouseLookup = useMemo(() => new Map(warehouseOptions.map((warehouse) => [warehouse.id, warehouse.name])), [warehouseOptions])
  const activeWorkOrder = workOrders.find((row) => row.id === activeWorkOrderId) ?? null
  const filteredSyncTemplates = useMemo(() => {
    const normalizedSearch = syncTemplateSearch.trim().toLowerCase()
    return templateOptions.filter((template) => {
      if (!syncPropertyId || template.propertyId !== syncPropertyId) {
        return false
      }

      return !normalizedSearch || template.label.toLowerCase().includes(normalizedSearch)
    })
  }, [syncPropertyId, syncTemplateSearch, templateOptions])
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
    filteredRows: filteredWorkOrders,
    sortedRows: sortedWorkOrders,
    groupedRowTree: groupedWorkOrders,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns: orderedWorkOrderColumns,
    visibleColumns: visibleWorkOrderColumns,
    hiddenColumnKeys: hiddenWorkOrderColumnKeys,
    toggleColumnVisibility: toggleWorkOrderColumnVisibility,
    moveColumn: moveWorkOrderColumn,
    setColumnOrder: setWorkOrderColumnOrder,
  } = useConfiguredTableState({
    rows: workOrders,
    tableKey: "work-orders-main",
    fields: [
      { key: "wo", label: "WO", getValue: (row) => row.workOrderNumber },
      { key: "edit", label: "Edit", getValue: () => "", searchable: false, groupable: false },
      { key: "open", label: "Open", getValue: () => "", searchable: false, groupable: false },
      { key: "status", label: "Status", getValue: (row) => workOrderStatusText(row) },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName },
      { key: "property", label: "Property", getValue: (row) => row.propertyName },
      { key: "address", label: "Address", getValue: (row) => buildWorkOrderAddress(propertyLookup.get(row.propertyId), row.customAddress) },
      { key: "customAddress", label: "Custom Address", getValue: (row) => row.customAddress },
      { key: "date", label: "Date", getValue: (row) => (row.date ? row.date.split("T")[0] : "No Date") },
      { key: "unit", label: "Unit", getValue: (row) => row.unitNumber },
      { key: "unitType", label: "Unit Type", getValue: (row) => row.unitType },
      { key: "vacancy", label: "Vacancy", getValue: (row) => row.vacancy ?? "" },
      { key: "instructions", label: "Instructions", getValue: (row) => row.instructions },
      { key: "notes", label: "Notes", getValue: (row) => row.notes },
      { key: "items", label: "Items", getValue: (row) => String(row.itemsCount ?? 0) },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.workOrderNumber,
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })
  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupOptions: groupFields.map((field) => ({ key: field.key, label: field.label })),
  })

  function setNewDraftField(field: keyof DraftWorkOrder, value: string) {
    setNewDraft((prev) => ({ ...prev, [field]: value }))
  }

  function resetTemplateCreateFlow() {
    setSyncPropertyId("")
    setSyncTemplateSearch("")
    setSelectedSyncTemplateId("")
  }

  function formatRow(row: WorkOrderRow) {
    return {
      displayOrder: row.workOrderNumber,
      displayAddress: buildWorkOrderAddress(propertyLookup.get(row.propertyId), row.customAddress),
    }
  }

  function hydrateWorkOrderRow(workOrder: WorkOrderRow) {
    const property = propertyLookup.get(workOrder.propertyId)

    return {
      ...workOrder,
      propertyName: property?.name ?? workOrder.propertyName,
      propertyAddress: buildWorkOrderAddress(property, workOrder.customAddress),
      warehouseName: warehouseLookup.get(workOrder.warehouseId) ?? workOrder.warehouseName,
    }
  }

  async function openWorkOrder(row: WorkOrderRow) {
    setMessage("")
    setError("")
    openWorkOrderPanel(row.id)
  }

  function closeWorkOrder() {
    setActiveWorkOrderSummary({ materialItems: [], serviceItems: [] })
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

      setWorkOrders((prev) => prev.map((row) => (row.id === payload.workOrder!.id ? hydrateWorkOrderRow(payload.workOrder!) : row)))
      setWorkOrderRefreshNonce((current) => current + 1)
      setMessage("Work order marked complete")
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Failed to complete work order")
    }
  }

  function selectedAddress(draft: DraftWorkOrder) {
    return buildWorkOrderAddress(propertyLookup.get(draft.propertyId), draft.customAddress)
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

      const createdWorkOrder = hydrateWorkOrderRow(payload.workOrder)

      setWorkOrders((prev) => {
        return [
          createdWorkOrder,
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

  async function createWorkOrderFromTemplate() {
    setIsCreatingFromTemplate(true)
    setMessage("")
    setError("")

    try {
      if (!syncPropertyId) {
        throw new Error("Property is required")
      }
      if (!selectedSyncTemplateId) {
        throw new Error("Template is required")
      }

      const payload = await requestJson<{
        workOrder?: WorkOrderRow
      }>("/api/flooring/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...defaultDraft,
          propertyId: syncPropertyId,
          templateId: selectedSyncTemplateId,
        }),
      })

      if (!payload.workOrder) throw new Error("Failed to create work order from template")

      const createdWorkOrder = hydrateWorkOrderRow(payload.workOrder)

      setWorkOrders((prev) => [createdWorkOrder, ...prev])
      setIsSyncCreateModalOpen(false)
      resetTemplateCreateFlow()
      setMessage("Work order created from template")
      openWorkOrderPanel(createdWorkOrder.id)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create work order from template")
    } finally {
      setIsCreatingFromTemplate(false)
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
    const cells: Record<string, ReactNode> = {
      wo: <td key="wo" className="px-3 py-2 font-medium text-blue-500">{line.displayOrder}</td>,
      edit: (
        <td key="edit" className="px-3 py-2">
          <EditRowButton onClick={() => void openWorkOrder(row)} className="px-2 py-1" />
        </td>
      ),
      open: (
        <td key="open" className="px-3 py-2">
          <OpenRowButton onClick={() => void openWorkOrder(row)} className="px-2 py-1">Open</OpenRowButton>
        </td>
      ),
      status: (
        <td key="status" className="px-3 py-2">
          {row.isComplete ? (
            <span className="inline-flex min-w-[110px] rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-center text-sm text-emerald-700">
              Complete
            </span>
          ) : (
            <span className={`inline-flex min-w-[110px] rounded border px-2 py-1 text-center text-sm ${getWorkOrderStatusFieldClass(row.status)}`}>{workOrderStatusText(row)}</span>
          )}
        </td>
      ),
      warehouse: <td key="warehouse" className="px-3 py-2">{row.warehouseName || "-"}</td>,
      property: <td key="property" className="px-3 py-2">{row.propertyName}</td>,
      address: <td key="address" className="px-3 py-2">{line.displayAddress}</td>,
      customAddress: <td key="customAddress" className="px-3 py-2">{row.customAddress || "-"}</td>,
      date: <td key="date" className="px-3 py-2">{row.date ? row.date.split("T")[0] : "-"}</td>,
      unit: <td key="unit" className="px-3 py-2">{[row.unitText, row.unitNumber].filter(Boolean).join(" ") || "-"}</td>,
      unitType: <td key="unitType" className="px-3 py-2">{row.unitType || "-"}</td>,
      vacancy: <td key="vacancy" className="px-3 py-2">{row.vacancy || "-"}</td>,
      instructions: <td key="instructions" className="px-3 py-2">{row.instructions || "-"}</td>,
      notes: <td key="notes" className="px-3 py-2">{row.notes || "-"}</td>,
      items: <td key="items" className="px-3 py-2">{row.itemsCount}</td>,
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
          </div>
            <TableActionsSummary count={filteredWorkOrders.length}>
              <TableControlsBar
                searchQuery={searchQuery}
                onSearchQueryChange={serverTableControls.onSearchQueryChange}
                searchPlaceholder="Search property"
                isAscendingSort={isAscendingSort}
                onToggleSort={serverTableControls.onToggleSort}
                ascendingSortLabel="1-9"
                descendingSortLabel="9-1"
                isGroupingEnabled={isGroupingEnabled}
                onToggleGrouping={serverTableControls.onToggleGrouping}
                groupOptions={groupFields.map((field) => ({ key: field.key, label: field.label }))}
                groupByKeys={groupByKeys}
                onGroupByKeyAtIndexChange={serverTableControls.onGroupByKeyAtIndexChange}
                onAddGroupBy={serverTableControls.onAddGroupBy}
                onRemoveGroupBy={serverTableControls.onRemoveGroupBy}
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
                <button
                  type="button"
                  onClick={() => {
                    setMessage("")
                    setError("")
                    resetTemplateCreateFlow()
                    setIsSyncCreateModalOpen(true)
                  }}
                  className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-500/20"
                >
                  Sync Template
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
          <TablePaginationControls
            page={pagination?.page ?? page}
            totalPages={pagination?.totalPages ?? totalPages}
            pageSize={pagination?.pageSize ?? pageSize}
            totalItems={pagination?.totalItems ?? filteredWorkOrders.length}
            hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
            hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
            onPreviousPage={pagination ? undefined : goToPreviousPage}
            onNextPage={pagination ? undefined : goToNextPage}
            previousPageHref={pagination?.previousPageHref}
            nextPageHref={pagination?.nextPageHref}
          />
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
                <select value={newDraft.status} onChange={(event) => setNewDraftField("status", event.target.value)} className={`rounded border px-3 py-2 ${getWorkOrderStatusFieldClass(newDraft.status)}`}>
                  {WORK_ORDER_STATUS_OPTIONS.map((value) => (
                    <option key={value} value={value}>{statusLabel(value)}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Vacancy">
                <select value={newDraft.vacancy} onChange={(event) => setNewDraftField("vacancy", event.target.value)} className={`rounded border px-3 py-2 ${getVacancyFieldClass(newDraft.vacancy)}`}>
                  <option value="">Select</option>
                  {VACANCY_OPTIONS.map((value) => (
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
              This creates a blank work order row. Use the table-level <span className="font-semibold text-[var(--foreground)]">Sync Template</span> action when starting from a property template.
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

      {isSyncCreateModalOpen && (
        <ModalShell title="Create Work Order From Template" onClose={() => !isCreatingFromTemplate && setIsSyncCreateModalOpen(false)}>
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[280px,minmax(0,1fr)]">
              <div className="space-y-4">
                <FormField label="Property">
                  <select
                    value={syncPropertyId}
                    onChange={(event) => {
                      setSyncPropertyId(event.target.value)
                      setSelectedSyncTemplateId("")
                      setSyncTemplateSearch("")
                    }}
                    className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                  >
                    <option value="">Select Property</option>
                    {propertyOptions.map((property) => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Search Templates">
                  <input
                    value={syncTemplateSearch}
                    onChange={(event) => setSyncTemplateSearch(event.target.value)}
                    placeholder={syncPropertyId ? "Search template tag" : "Select property first"}
                    disabled={!syncPropertyId}
                    className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 disabled:opacity-60"
                  />
                </FormField>

                <div className="rounded-lg border border-[var(--panel-border)] px-3 py-3 text-sm text-[var(--foreground)]/70">
                  Select the property first, search its templates, then create the work order. The new row will be created from that template and opened immediately.
                </div>
              </div>

              <div className="space-y-3">
                <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--panel-border)]">
                  {!syncPropertyId ? (
                    <p className="px-4 py-8 text-center text-sm text-[var(--foreground)]/70">Select a property to load templates.</p>
                  ) : filteredSyncTemplates.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-[var(--foreground)]/70">No templates available for the selected property.</p>
                  ) : (
                    filteredSyncTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedSyncTemplateId(template.id)}
                        className={`flex w-full items-center justify-between border-t border-[var(--panel-border)] px-4 py-3 text-left first:border-t-0 ${selectedSyncTemplateId === template.id ? "bg-blue-500/10 text-blue-500" : "hover:bg-[var(--panel-hover)]"}`}
                      >
                        <span>{template.label}</span>
                        <span className="text-xs uppercase tracking-[0.18em]">{selectedSyncTemplateId === template.id ? "Selected" : "Open"}</span>
                      </button>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSyncCreateModalOpen(false)}
                    disabled={isCreatingFromTemplate}
                    className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void createWorkOrderFromTemplate()}
                    disabled={isCreatingFromTemplate || !syncPropertyId || !selectedSyncTemplateId}
                    className="rounded border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-600 hover:bg-blue-500/20 disabled:opacity-60"
                  >
                    {isCreatingFromTemplate ? "Creating..." : "Create And Open Work Order"}
                  </button>
                </div>
              </div>
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
            initialWorkOrder={activeWorkOrder}
            propertyOptions={propertyOptions}
            warehouseOptions={warehouseOptions}
            productOptions={productOptions}
            serviceOptions={serviceOptions}
            unitOptions={unitOptions}
            onClose={closeWorkOrder}
            refreshNonce={workOrderRefreshNonce}
            onSummaryChange={setActiveWorkOrderSummary}
            onWorkOrderSaved={(savedWorkOrder) => {
              setWorkOrders((prev) =>
                prev.map((row) =>
                  row.id === savedWorkOrder.id
                    ? {
                        ...hydrateWorkOrderRow(savedWorkOrder),
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
