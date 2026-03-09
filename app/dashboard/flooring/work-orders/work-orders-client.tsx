"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type WorkOrderRow = {
  id: string
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
}: {
  initialWorkOrders: WorkOrderRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
}) {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>(initialWorkOrders)
  const [drafts, setDrafts] = useState<Record<string, DraftWorkOrder>>({})
  const [newDraft, setNewDraft] = useState<DraftWorkOrder>(defaultDraft)
  const [showNewRow, setShowNewRow] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const propertyLookup = useMemo(() => {
    const map = new Map(propertyOptions.map((property) => [property.id, property]))
    return map
  }, [propertyOptions])

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

  function formatRow(row: WorkOrderRow, index: number) {
    return {
      displayOrder: `WO-${String(index + 1).padStart(4, "0")}`,
      displayAddress: buildWorkOrderAddress(propertyLookup.get(row.propertyId), row.customAddress),
    }
  }

  async function saveWorkOrder(row: WorkOrderRow) {
    setError("")
    setMessage("")
    setIsSaving(row.id)

    try {
      const draft = getDraft(row.id)

      const response = await fetch(`/api/flooring/work-orders/${row.id}`, {
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

      setWorkOrders((prev) => prev.map((item) => (item.id === row.id ? payload.workOrder! : item)))
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

      const property = propertyLookup.get(payload.workOrder.propertyId)

      setWorkOrders((prev) => [
        {
          ...payload.workOrder,
          propertyName: property?.name ?? payload.workOrder.propertyName,
          propertyAddress: buildWorkOrderAddress(property, payload.workOrder.customAddress),
          warehouseName: warehouseOptions.find((item) => item.id === payload.workOrder.warehouseId)?.name ?? "",
        },
        ...prev,
      ])
      setShowNewRow(false)
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
      setMessage("Work order deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete work order")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="w-full space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <h1 className="text-2xl font-bold text-blue-500">Work Orders</h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">Create and manage work orders for flooring operations.</p>

          {message && <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p>}
          {error && <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">WO</th>
                  <th className="px-3 py-2">Open</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Warehouse</th>
                  <th className="px-3 py-2">Property</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">Custom Address</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Unit Type</th>
                  <th className="px-3 py-2">Vacancy</th>
                  <th className="px-3 py-2">Instructions</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2">Image URL</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2">Save</th>
                  <th className="px-3 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {showNewRow && (
                  <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30">
                    <td className="px-3 py-2 text-xs text-[var(--foreground)]/50">(new)</td>
                    <td className="px-3 py-2 text-xs text-[var(--foreground)]/50">-</td>
                    <td className="px-3 py-2">
                      <select
                        value={newDraft.status}
                        onChange={(event) => setNewDraftField("status", event.target.value)}
                        className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      >
                        {statusOptions.map((value) => (
                          <option key={value} value={value}>
                            {statusLabel(value)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={newDraft.warehouseId}
                        onChange={(event) => setNewDraftField("warehouseId", event.target.value)}
                        className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      >
                        <option value="">Select Warehouse</option>
                        {warehouseOptions.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={newDraft.propertyId}
                        onChange={(event) => setNewDraftField("propertyId", event.target.value)}
                        className="w-60 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      >
                        <option value="">Select Property</option>
                        {propertyOptions.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">{buildWorkOrderAddress(propertyLookup.get(newDraft.propertyId), newDraft.customAddress)}</td>
                    <td className="px-3 py-2">
                      <input
                        value={newDraft.customAddress}
                        onChange={(event) => setNewDraftField("customAddress", event.target.value)}
                        placeholder="Custom address"
                        className="w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={newDraft.date}
                        onChange={(event) => setNewDraftField("date", event.target.value)}
                        className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <input
                          value={newDraft.unitText}
                          onChange={(event) => setNewDraftField("unitText", event.target.value)}
                          placeholder="Unit"
                          className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                        <input
                          value={newDraft.unitNumber}
                          onChange={(event) => setNewDraftField("unitNumber", event.target.value)}
                          placeholder="#"
                          className="w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={newDraft.unitType}
                        onChange={(event) => setNewDraftField("unitType", event.target.value)}
                        className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={newDraft.vacancy}
                        onChange={(event) => setNewDraftField("vacancy", event.target.value)}
                        className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      >
                        <option value="">Select</option>
                        {vacancyOptions.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        value={newDraft.instructions}
                        onChange={(event) => setNewDraftField("instructions", event.target.value)}
                        className="h-16 w-60 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        value={newDraft.notes}
                        onChange={(event) => setNewDraftField("notes", event.target.value)}
                        className="h-16 w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={newDraft.workOrderImageUrl}
                        onChange={(event) => setNewDraftField("workOrderImageUrl", event.target.value)}
                        className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">0</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void createWorkOrder()}
                        disabled={isSavingNew}
                        className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                      >
                        {isSavingNew ? "Adding..." : "Add"}
                      </button>
                    </td>
                    <td className="px-3 py-2">-</td>
                  </tr>
                )}

                {workOrders.map((row, index) => {
                  const line = formatRow(row, index)
                  const draft = getDraft(row.id)
                  const selectedProperty = propertyLookup.get(draft.propertyId)

                  return (
                    <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
                      <td className="px-3 py-2 font-medium text-blue-500">{line.displayOrder}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/flooring/work-orders/${row.id}`)}
                          className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs hover:bg-[var(--panel-hover)]"
                        >
                          Open
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draft.status}
                          onChange={(event) => setDraftField(row.id, "status", event.target.value)}
                          className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        >
                          {statusOptions.map((value) => (
                            <option key={value} value={value}>
                              {statusLabel(value)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draft.warehouseId}
                          onChange={(event) => setDraftField(row.id, "warehouseId", event.target.value)}
                          className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        >
                          <option value="">No warehouse</option>
                          {warehouseOptions.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draft.propertyId}
                          onChange={(event) => setDraftField(row.id, "propertyId", event.target.value)}
                          className="w-60 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        >
                          <option value="">Select Property</option>
                          {propertyOptions.map((property) => (
                            <option key={property.id} value={property.id}>
                              {property.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">{line.displayAddress}</td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.customAddress}
                          onChange={(event) => setDraftField(row.id, "customAddress", event.target.value)}
                          placeholder="Custom address"
                          className="w-72 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={draft.date}
                          onChange={(event) => setDraftField(row.id, "date", event.target.value)}
                          className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <input
                            value={draft.unitText}
                            onChange={(event) => setDraftField(row.id, "unitText", event.target.value)}
                            className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                          <input
                            value={draft.unitNumber}
                            onChange={(event) => setDraftField(row.id, "unitNumber", event.target.value)}
                            className="w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.unitType}
                          onChange={(event) => setDraftField(row.id, "unitType", event.target.value)}
                          className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draft.vacancy}
                          onChange={(event) => setDraftField(row.id, "vacancy", event.target.value)}
                          className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        >
                          <option value="">Select</option>
                          {vacancyOptions.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          value={draft.instructions}
                          onChange={(event) => setDraftField(row.id, "instructions", event.target.value)}
                          className="h-16 w-60 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          value={draft.notes}
                          onChange={(event) => setDraftField(row.id, "notes", event.target.value)}
                          className="h-16 w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.workOrderImageUrl}
                          onChange={(event) => setDraftField(row.id, "workOrderImageUrl", event.target.value)}
                          className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">{row.itemsCount}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void saveWorkOrder(row)}
                          disabled={isSaving === row.id}
                          className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                        >
                          {isSaving === row.id ? "Saving..." : "Save"}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void deleteWorkOrder(row.id)}
                          disabled={deletingId === row.id}
                          className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
                        >
                          {deletingId === row.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {workOrders.length === 0 && !showNewRow && (
                  <tr>
                    <td colSpan={17} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No work orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowNewRow(true)}
              disabled={showNewRow}
              className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
            >
              Add Row
            </button>

            <Link href="/dashboard/flooring" className="text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)]">
              Back to flooring
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
