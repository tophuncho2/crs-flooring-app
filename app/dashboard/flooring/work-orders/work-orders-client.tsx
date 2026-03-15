"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import { ErrorNotice, SuccessNotice } from "../shared/notices"
import { DeleteRowButton, OpenRowButton, SaveRowButton } from "../shared/row-action-buttons"
import { TableColumnSettings } from "../shared/table-column-settings"
import TableControlsBar from "../shared/table-controls-bar"
import { ModalTableHead, ModalTableShell, TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "../shared/table-shell"
import { useTableColumns } from "../shared/use-table-columns"
import { MAX_GROUP_FIELDS, type GroupedRowTree, useTableControls } from "../shared/use-table-controls"

type WorkOrderRow = {
  id: string
  workOrderNumber: number
  propertyId: string
  propertyName: string
  propertyAddress: string
  warehouseId: string
  warehouseName: string
  status: string
  statusLabel: string
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

type ProductOption = {
  id: string
  name: string
  sendUnit: string
}

type WorkOrderItem = {
  id: string
  productId: string
  productName: string
  sendUnit: string
  quantity: string
  notes: string
  linkedInventoryId: string
  linkedInventoryLabel: string
  changeOrderStatus: "SUFFICIENT" | "SHORTAGE"
}

type WorkOrderItemDraft = {
  productId: string
  quantity: string
  notes: string
}

type DraftWorkOrder = {
  propertyId: string
  warehouseId: string
  status: string
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
  "COMPLETE",
]

const statusLabelByValue: Record<string, string> = {
  BUILDING_ORDER: "Building Order",
  PENDING_EXPORT: "Pending Export",
  CARPET_CLEANING: "Carpet Cleaning",
  SENT_OUT: "Sent Out",
  COMPLETE: "Complete",
}

const vacancyOptions: Array<"VACANT" | "OCCUPIED"> = ["VACANT", "OCCUPIED"]

function statusLabel(value: string) {
  return statusLabelByValue[value] ?? value
}

function statusFieldClass(value: string) {
  if (value === "BUILDING_ORDER") return "border-amber-500/40 bg-amber-500/10 text-amber-700"
  if (value === "PENDING_EXPORT") return "border-sky-500/40 bg-sky-500/10 text-sky-700"
  if (value === "CARPET_CLEANING") return "border-violet-500/40 bg-violet-500/10 text-violet-700"
  if (value === "SENT_OUT") return "border-orange-500/40 bg-orange-500/10 text-orange-700"
  if (value === "COMPLETE") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
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

function workOrderDisplayNumber(workOrderNumber: number) {
  return `WO-${String(workOrderNumber).padStart(4, "0")}`
}

const defaultDraft: DraftWorkOrder = {
  propertyId: "",
  warehouseId: "",
  status: "BUILDING_ORDER",
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

const emptyItemDraft: WorkOrderItemDraft = {
  productId: "",
  quantity: "",
  notes: "",
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

export default function WorkOrdersClient({
  initialWorkOrders,
  propertyOptions,
  warehouseOptions,
  productOptions,
}: {
  initialWorkOrders: WorkOrderRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  productOptions: ProductOption[]
}) {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>(initialWorkOrders)
  const [drafts, setDrafts] = useState<Record<string, DraftWorkOrder>>({})
  const [newDraft, setNewDraft] = useState<DraftWorkOrder>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [activeWorkOrderId, setActiveWorkOrderId] = useState<string | null>(null)
  const [activeWorkOrderDraft, setActiveWorkOrderDraft] = useState<DraftWorkOrder>(defaultDraft)
  const [activeItems, setActiveItems] = useState<WorkOrderItem[]>([])
  const [itemDraft, setItemDraft] = useState<WorkOrderItemDraft>(emptyItemDraft)
  const [loadingItems, setLoadingItems] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [isSavingModal, setIsSavingModal] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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
    sortField: (row) => String(row.workOrderNumber),
    groupFields: [
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName },
      { key: "property", label: "Property", getValue: (row) => row.propertyName },
      { key: "date", label: "Date", getValue: (row) => (row.date ? row.date.split("T")[0] : "No Date") },
      { key: "status", label: "Status", getValue: (row) => row.statusLabel },
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
      displayOrder: workOrderDisplayNumber(row.workOrderNumber),
      displayAddress: buildWorkOrderAddress(propertyLookup.get(row.propertyId), row.customAddress),
    }
  }

  async function loadWorkOrderItems(workOrderId: string) {
    setLoadingItems(true)

    try {
      const response = await fetch(`/api/flooring/work-orders/${workOrderId}/items`)
      const payload = (await response.json().catch(() => ({}))) as { items?: WorkOrderItem[]; error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load work order items")
      }

      setActiveItems(payload.items ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load work order items")
      setActiveItems([])
    } finally {
      setLoadingItems(false)
    }
  }

  async function openWorkOrder(row: WorkOrderRow) {
    setMessage("")
    setError("")
    setActiveWorkOrderDraft({
      propertyId: row.propertyId,
      warehouseId: row.warehouseId,
      status: row.status,
      vacancy: row.vacancy ?? "",
      date: dateInputValue(row.date),
      unitText: row.unitText,
      unitNumber: row.unitNumber,
      unitType: row.unitType,
      customAddress: row.customAddress,
      instructions: row.instructions,
      notes: row.notes,
      workOrderImageUrl: row.workOrderImageUrl,
    })
    setItemDraft(emptyItemDraft)
    setActiveWorkOrderId(row.id)
    await loadWorkOrderItems(row.id)
  }

  function closeWorkOrder() {
    if (isSavingModal || isAddingItem || savingItemId || deletingItemId) return
    setActiveWorkOrderId(null)
    setActiveItems([])
    setItemDraft(emptyItemDraft)
  }

  function selectedAddress(draft: DraftWorkOrder) {
    return buildWorkOrderAddress(propertyLookup.get(draft.propertyId), draft.customAddress)
  }

  async function persistWorkOrder(id: string, draft: DraftWorkOrder) {
    const response = await fetch(`/api/flooring/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      workOrder?: WorkOrderRow
    }

    if (!response.ok || !payload.workOrder) {
      throw new Error(payload.error ?? "Failed to save work order")
    }

    return payload.workOrder
  }

  async function saveWorkOrder(row: WorkOrderRow) {
    setError("")
    setMessage("")
    setIsSaving(row.id)

    try {
      const savedWorkOrder = await persistWorkOrder(row.id, getDraft(row.id))
      setWorkOrders((prev) => prev.map((item) => (item.id === row.id ? { ...savedWorkOrder, workOrderNumber: item.workOrderNumber } : item)))
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

  async function saveActiveWorkOrder() {
    if (!activeWorkOrder) return

    setError("")
    setMessage("")
    setIsSavingModal(true)

    try {
      const savedWorkOrder = await persistWorkOrder(activeWorkOrder.id, activeWorkOrderDraft)
      setWorkOrders((prev) =>
        prev.map((item) => (item.id === activeWorkOrder.id ? { ...savedWorkOrder, workOrderNumber: item.workOrderNumber } : item)),
      )
      setActiveWorkOrderDraft({
        propertyId: savedWorkOrder.propertyId,
        warehouseId: savedWorkOrder.warehouseId,
        status: savedWorkOrder.status,
        vacancy: savedWorkOrder.vacancy ?? "",
        date: dateInputValue(savedWorkOrder.date),
        unitText: savedWorkOrder.unitText,
        unitNumber: savedWorkOrder.unitNumber,
        unitType: savedWorkOrder.unitType,
        customAddress: savedWorkOrder.customAddress,
        instructions: savedWorkOrder.instructions,
        notes: savedWorkOrder.notes,
        workOrderImageUrl: savedWorkOrder.workOrderImageUrl,
      })
      setMessage("Work order saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save work order")
    } finally {
      setIsSavingModal(false)
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

      const response = await fetch("/api/flooring/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        workOrder?: WorkOrderRow
      }

      if (!response.ok || !payload.workOrder) {
        throw new Error(payload.error ?? "Failed to create work order")
      }

      const createdWorkOrder = payload.workOrder
      const property = propertyLookup.get(createdWorkOrder.propertyId)

      setWorkOrders((prev) => {
        const nextWorkOrderNumber = prev.reduce((maxValue, item) => Math.max(maxValue, item.workOrderNumber), 0) + 1
        return [
          {
            ...createdWorkOrder,
            workOrderNumber: nextWorkOrderNumber,
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
      const response = await fetch(`/api/flooring/work-orders/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? "Failed to delete work order")
      }

      setWorkOrders((prev) => prev.filter((row) => row.id !== id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      if (activeWorkOrderId === id) {
        setActiveWorkOrderId(null)
        setActiveItems([])
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
          <select value={draft.status} onChange={(event) => setDraftField(row.id, "status", event.target.value)} className={`w-44 rounded border px-2 py-1 ${statusFieldClass(draft.status)}`}>
            {statusOptions.map((value) => (
              <option key={value} value={value}>{statusLabel(value)}</option>
            ))}
          </select>
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

  async function addItem() {
    if (!activeWorkOrder) return

    setIsAddingItem(true)
    setError("")
    setMessage("")

    try {
      if (!itemDraft.productId) throw new Error("Product is required")
      if (!itemDraft.quantity.trim()) throw new Error("Quantity is required")

      const response = await fetch(`/api/flooring/work-orders/${activeWorkOrder.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add item")
      }

      setItemDraft(emptyItemDraft)
      await loadWorkOrderItems(activeWorkOrder.id)
      setWorkOrders((prev) => prev.map((row) => (row.id === activeWorkOrder.id ? { ...row, itemsCount: row.itemsCount + 1 } : row)))
      setMessage("Item added")
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Failed to add item")
    } finally {
      setIsAddingItem(false)
    }
  }

  function setActiveItemField(itemId: string, field: keyof WorkOrderItem, value: string) {
    setActiveItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))
  }

  async function saveItem(item: WorkOrderItem) {
    if (!activeWorkOrder) return

    setError("")
    setMessage("")
    setSavingItemId(item.id)

    try {
      const response = await fetch(`/api/flooring/work-orders/${activeWorkOrder.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save item")
      }

      await loadWorkOrderItems(activeWorkOrder.id)
      setMessage("Item saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save item")
    } finally {
      setSavingItemId(null)
    }
  }

  async function deleteItem(itemId: string) {
    if (!activeWorkOrder) return

    setError("")
    setMessage("")
    setDeletingItemId(itemId)

    try {
      const response = await fetch(`/api/flooring/work-orders/${activeWorkOrder.id}/items/${itemId}`, {
        method: "DELETE",
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete item")
      }

      setActiveItems((prev) => prev.filter((item) => item.id !== itemId))
      setWorkOrders((prev) => prev.map((row) => (row.id === activeWorkOrder.id ? { ...row, itemsCount: Math.max(0, row.itemsCount - 1) } : row)))
      setMessage("Item deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete item")
    } finally {
      setDeletingItemId(null)
    }
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
        <ModalShell title={`Work Order ${activeWorkOrder.id.slice(0, 8)}`} onClose={closeWorkOrder}>
          <div className="space-y-6">
            {message && <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p>}
            {error && <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Property">
                <select value={activeWorkOrderDraft.propertyId} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, propertyId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Warehouse">
                <select value={activeWorkOrderDraft.warehouseId} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, warehouseId: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">No warehouse</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select value={activeWorkOrderDraft.status} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, status: event.target.value }))} className={`rounded border px-3 py-2 ${statusFieldClass(activeWorkOrderDraft.status)}`}>
                  {statusOptions.map((value) => (
                    <option key={value} value={value}>{statusLabel(value)}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Vacancy">
                <select value={activeWorkOrderDraft.vacancy} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, vacancy: event.target.value as DraftWorkOrder["vacancy"] }))} className={`rounded border px-3 py-2 ${vacancyFieldClass(activeWorkOrderDraft.vacancy)}`}>
                  <option value="">Select</option>
                  {vacancyOptions.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Address">
                <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
                  {selectedAddress(activeWorkOrderDraft) || "Select a property or enter a custom address"}
                </div>
              </FormField>
              <FormField label="Custom Address">
                <input value={activeWorkOrderDraft.customAddress} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, customAddress: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Date">
                <input type="date" value={activeWorkOrderDraft.date} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, date: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Unit Type">
                <input value={activeWorkOrderDraft.unitType} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, unitType: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Unit Label">
                <input value={activeWorkOrderDraft.unitText} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, unitText: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Unit Number">
                <input value={activeWorkOrderDraft.unitNumber} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, unitNumber: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Image URL">
                <input value={activeWorkOrderDraft.workOrderImageUrl} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, workOrderImageUrl: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Instructions">
                <textarea value={activeWorkOrderDraft.instructions} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, instructions: event.target.value }))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
              </FormField>
              <FormField label="Notes">
                <textarea value={activeWorkOrderDraft.notes} onChange={(event) => setActiveWorkOrderDraft((prev) => ({ ...prev, notes: event.target.value }))} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
              </FormField>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Work Order Items</h3>
                <p className="text-sm text-[var(--foreground)]/70">Add the line items required for this work order.</p>
              </div>

              <div className="grid gap-3 rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] md:grid-cols-[minmax(0,1.5fr),120px,minmax(0,1fr),auto] md:items-end">
                <FormField label="Product">
                  <select value={itemDraft.productId} onChange={(event) => setItemDraft((prev) => ({ ...prev, productId: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2">
                    <option value="">Select product</option>
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Qty">
                  <input value={itemDraft.quantity} onChange={(event) => setItemDraft((prev) => ({ ...prev, quantity: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
                </FormField>
                <FormField label="Notes">
                  <input value={itemDraft.notes} onChange={(event) => setItemDraft((prev) => ({ ...prev, notes: event.target.value }))} className="rounded border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2" />
                </FormField>
                <button type="button" onClick={() => void addItem()} disabled={isAddingItem} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60">
                  {isAddingItem ? "Adding..." : "Add Item"}
                </button>
              </div>

              <ModalTableShell minWidthClass="min-w-[900px]">
                <ModalTableHead>
                    <tr>
                      <TableHeaderCell>Product</TableHeaderCell>
                      <TableHeaderCell>Qty</TableHeaderCell>
                      <TableHeaderCell>Unit</TableHeaderCell>
                      <TableHeaderCell>Notes</TableHeaderCell>
                      <TableHeaderCell>Save</TableHeaderCell>
                      <TableHeaderCell>Delete</TableHeaderCell>
                    </tr>
                </ModalTableHead>
                  <tbody>
                    {loadingItems ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-[var(--foreground)]/70">Loading items...</td>
                      </tr>
                    ) : activeItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-[var(--foreground)]/70">No work order items yet.</td>
                      </tr>
                    ) : (
                      activeItems.map((item) => (
                        <tr key={item.id} className="border-t border-[var(--panel-border)]">
                          <td className="px-3 py-2">
                            <select value={item.productId} onChange={(event) => setActiveItemField(item.id, "productId", event.target.value)} className="w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                              {productOptions.map((product) => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input value={item.quantity} onChange={(event) => setActiveItemField(item.id, "quantity", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                          </td>
                          <td className="px-3 py-2">{productOptions.find((product) => product.id === item.productId)?.sendUnit || item.sendUnit || "-"}</td>
                          <td className="px-3 py-2">
                            <input value={item.notes} onChange={(event) => setActiveItemField(item.id, "notes", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                          </td>
                          <td className="px-3 py-2">
                            <SaveRowButton onClick={() => void saveItem(item)} disabled={savingItemId === item.id}>
                              {savingItemId === item.id ? "Saving..." : "Save"}
                            </SaveRowButton>
                          </td>
                          <td className="px-3 py-2">
                            <DeleteRowButton onClick={() => void deleteItem(item.id)} disabled={deletingItemId === item.id}>
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
              <button type="button" onClick={closeWorkOrder} disabled={isSavingModal} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
                Close
              </button>
              <button type="button" onClick={() => void saveActiveWorkOrder()} disabled={isSavingModal} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isSavingModal ? "Saving..." : "Save Work Order"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
