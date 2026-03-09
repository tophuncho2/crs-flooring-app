"use client"

import Link from "next/link"
import { useState } from "react"

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

const vacancyOptions = ["VACANT", "OCCUPIED"] as const

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
}

type WorkOrderItem = {
  id: string
  productId: string
  productName: string
  quantity: string
  notes: string
}

type WorkOrderDetail = {
  id: string
  property: {
    id: string
    name: string
    address: string
  }
  warehouse: {
    id: string
    name: string
  } | null
  status: string
  vacancy: "VACANT" | "OCCUPIED" | null
  date: string | null
  unitText: string
  unitNumber: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
  items: WorkOrderItem[]
}

type WorkOrderDraft = {
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

type ItemDraft = {
  productId: string
  quantity: string
  notes: string
}

function toDateValue(value: string | null) {
  if (!value) return ""
  return value.split("T")[0]
}

function displayAddress(address: string, custom: string) {
  return custom.trim() ? custom : address
}

export default function WorkOrderDetailClient({
  workOrder: initial,
  productOptions,
  propertyOptions,
  warehouseOptions,
}: {
  workOrder: WorkOrderDetail
  productOptions: ProductOption[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
}) {
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail>(initial)
  const [draft, setDraft] = useState<WorkOrderDraft>({
    propertyId: initial.property.id,
    warehouseId: initial.warehouse?.id ?? "",
    status: initial.status,
    vacancy: initial.vacancy ?? "",
    date: toDateValue(initial.date),
    unitText: initial.unitText,
    unitNumber: initial.unitNumber,
    unitType: initial.unitType,
    customAddress: initial.customAddress,
    instructions: initial.instructions,
    notes: initial.notes,
    workOrderImageUrl: initial.workOrderImageUrl,
  })

  const [items, setItems] = useState<WorkOrderItem[]>(initial.items)
  const [itemDraft, setItemDraft] = useState<ItemDraft>({ productId: "", quantity: "", notes: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isDeletingItemId, setIsDeletingItemId] = useState<string | null>(null)

  function setDraftField(field: keyof WorkOrderDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function setItemDraftField(field: keyof ItemDraft, value: string) {
    setItemDraft((prev) => ({ ...prev, [field]: value }))
  }

  function computedAddress() {
    const selected = propertyOptions.find((item) => item.id === draft.propertyId)
    return displayAddress(selected?.address ?? workOrder.property.address, draft.customAddress)
  }

  async function saveWorkOrder() {
    setIsSaving(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch(`/api/flooring/work-orders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        workOrder?: {
          id: string
          propertyId: string
          propertyName: string
          propertyAddress: string
          warehouseId: string
          warehouseName: string
          status: string
          vacancy: "VACANT" | "OCCUPIED" | null
          date: string | null
          unitText: string
          unitNumber: string
          unitType: string
          customAddress: string
          instructions: string
          notes: string
          workOrderImageUrl: string
        }
      }

      if (!response.ok || !payload.workOrder) {
        throw new Error(payload.error ?? "Failed to save work order")
      }

      const selectedProperty = propertyOptions.find((property) => property.id === payload.workOrder.propertyId)
      const selectedWarehouse = warehouseOptions.find((warehouse) => warehouse.id === payload.workOrder.warehouseId)

      setWorkOrder((prev) => ({
        ...prev,
        property: {
          ...prev.property,
          id: payload.workOrder.propertyId,
          name: payload.workOrder.propertyName,
          address: selectedProperty?.address ?? prev.property.address,
        },
        warehouse: payload.workOrder.warehouseId
          ? {
              id: payload.workOrder.warehouseId,
              name: selectedWarehouse?.name ?? prev.warehouse?.name ?? "",
            }
          : null,
        status: payload.workOrder.status,
        vacancy: payload.workOrder.vacancy,
        date: payload.workOrder.date,
        unitText: payload.workOrder.unitText,
        unitNumber: payload.workOrder.unitNumber,
        unitType: payload.workOrder.unitType,
        customAddress: payload.workOrder.customAddress,
        instructions: payload.workOrder.instructions,
        notes: payload.workOrder.notes,
        workOrderImageUrl: payload.workOrder.workOrderImageUrl,
      }))

      setMessage("Work order saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save work order")
    } finally {
      setIsSaving(false)
    }
  }

  async function addItem() {
    setIsAddingItem(true)
    setError("")
    setMessage("")

    try {
      if (!itemDraft.productId) {
        throw new Error("Product is required")
      }
      if (!itemDraft.quantity) {
        throw new Error("Quantity is required")
      }

      const response = await fetch(`/api/flooring/work-orders/${workOrder.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        item?: WorkOrderItem
      }

      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "Failed to add item")
      }

      setItems((prev) => [payload.item as WorkOrderItem, ...prev])
      setItemDraft({ productId: "", quantity: "", notes: "" })
      setMessage("Item added")
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Failed to add item")
    } finally {
      setIsAddingItem(false)
    }
  }

  async function deleteItem(itemId: string) {
    setError("")
    setMessage("")
    setIsDeletingItemId(itemId)

    try {
      const response = await fetch(`/api/flooring/work-orders/${workOrder.id}/items/${itemId}`, {
        method: "DELETE",
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete item")
      }

      setItems((prev) => prev.filter((item) => item.id !== itemId))
      setMessage("Item deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete item")
    } finally {
      setIsDeletingItemId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-2 pb-12 pt-20 text-[var(--foreground)] sm:px-3 sm:pt-24 lg:px-4">
      <div className="w-full space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <h1 className="text-2xl font-bold text-blue-500">Work Order {workOrder.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">Top fields sync to the row record, items are added below.</p>

          {message && <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p>}
          {error && <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Property</span>
              <select
                value={draft.propertyId}
                onChange={(event) => setDraftField("propertyId", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              >
                {propertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Address</span>
              <input value={computedAddress()} readOnly className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Custom Address</span>
              <input
                value={draft.customAddress}
                onChange={(event) => setDraftField("customAddress", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Status</span>
              <select
                value={draft.status}
                onChange={(event) => setDraftField("status", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              >
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {statusLabelByValue[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Warehouse</span>
              <select
                value={draft.warehouseId}
                onChange={(event) => setDraftField("warehouseId", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              >
                <option value="">No warehouse</option>
                {warehouseOptions.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Date</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraftField("date", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Unit Text</span>
              <input
                value={draft.unitText}
                onChange={(event) => setDraftField("unitText", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Unit Number</span>
              <input
                value={draft.unitNumber}
                onChange={(event) => setDraftField("unitNumber", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Unit Type</span>
              <input
                value={draft.unitType}
                onChange={(event) => setDraftField("unitType", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Vacancy</span>
              <select
                value={draft.vacancy}
                onChange={(event) => setDraftField("vacancy", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              >
                <option value="">Select</option>
                {vacancyOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Work Order Image URL</span>
              <input
                value={draft.workOrderImageUrl}
                onChange={(event) => setDraftField("workOrderImageUrl", event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              />
            </label>

            <label className="md:col-span-2 xl:col-span-3 flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Instructions</span>
              <textarea
                value={draft.instructions}
                onChange={(event) => setDraftField("instructions", event.target.value)}
                className="h-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              />
            </label>
            <label className="md:col-span-2 xl:col-span-3 flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/70">Notes</span>
              <textarea
                value={draft.notes}
                onChange={(event) => setDraftField("notes", event.target.value)}
                className="h-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
              />
            </label>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => void saveWorkOrder()}
              disabled={isSaving}
              className="rounded border border-[var(--panel-border)] px-4 py-2 hover:bg-[var(--panel-hover)] disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Work Order"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold">Work Order Items</h2>

          <div className="grid gap-3 md:grid-cols-4 mb-4">
            <select
              value={itemDraft.productId}
              onChange={(event) => setItemDraftField("productId", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
            >
              <option value="">Select Product</option>
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={itemDraft.quantity}
              onChange={(event) => setItemDraftField("quantity", event.target.value)}
              placeholder="Quantity"
              className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
            />

            <input
              value={itemDraft.notes}
              onChange={(event) => setItemDraftField("notes", event.target.value)}
              placeholder="Notes"
              className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1 md:col-span-2"
            />

            <button
              type="button"
              onClick={() => void addItem()}
              disabled={isAddingItem}
              className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
            >
              {isAddingItem ? "Adding..." : "Add Item"}
            </button>
          </div>

          <div className="overflow-x-auto rounded border border-[var(--panel-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Quantity</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--panel-border)]">
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{item.notes}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void deleteItem(item.id)}
                        disabled={isDeletingItemId === item.id}
                        className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
                      >
                        {isDeletingItemId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No items yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Link href="/dashboard/flooring/work-orders" className="text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)]">
              Back to work order list
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
