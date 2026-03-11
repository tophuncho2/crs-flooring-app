"use client"

import Link from "next/link"
import { type ReactNode, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

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

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
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
}: {
  initialWorkOrders: WorkOrderRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
}) {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>(initialWorkOrders)
  const [drafts, setDrafts] = useState<Record<string, DraftWorkOrder>>({})
  const [newDraft, setNewDraft] = useState<DraftWorkOrder>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
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

  function openCreateModal() {
    setMessage("")
    setError("")
    setNewDraft(defaultDraft)
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (isSavingNew) return
    setIsCreateModalOpen(false)
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

      const savedWorkOrder = payload.workOrder
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

      setWorkOrders((prev) => [
        {
          ...createdWorkOrder,
          propertyName: property?.name ?? createdWorkOrder.propertyName,
          propertyAddress: buildWorkOrderAddress(property, createdWorkOrder.customAddress),
          warehouseName: warehouseOptions.find((item) => item.id === createdWorkOrder.warehouseId)?.name ?? "",
        },
        ...prev,
      ])
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

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)]"
            >
              Add Work Order
            </button>
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
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
                {workOrders.map((row, index) => {
                  const line = formatRow(row, index)
                  const draft = getDraft(row.id)

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
                          className={`w-44 rounded border px-2 py-1 ${statusFieldClass(draft.status)}`}
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
                          className={`w-28 rounded border px-2 py-1 ${vacancyFieldClass(draft.vacancy)}`}
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

                {workOrders.length === 0 && (
                  <tr>
                    <td colSpan={17} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No work orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </section>
      </div>

      {isCreateModalOpen && (
        <ModalShell title="New Work Order" onClose={closeCreateModal}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Property">
                <select
                  value={newDraft.propertyId}
                  onChange={(event) => setNewDraftField("propertyId", event.target.value)}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  <option value="">Select Property</option>
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Warehouse">
                <select
                  value={newDraft.warehouseId}
                  onChange={(event) => setNewDraftField("warehouseId", event.target.value)}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  <option value="">Select Warehouse</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Status">
                <select
                  value={newDraft.status}
                  onChange={(event) => setNewDraftField("status", event.target.value)}
                  className={`rounded border px-3 py-2 ${statusFieldClass(newDraft.status)}`}
                >
                  {statusOptions.map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Vacancy">
                <select
                  value={newDraft.vacancy}
                  onChange={(event) => setNewDraftField("vacancy", event.target.value)}
                  className={`rounded border px-3 py-2 ${vacancyFieldClass(newDraft.vacancy)}`}
                >
                  <option value="">Select</option>
                  {vacancyOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Address">
                <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
                  {buildWorkOrderAddress(propertyLookup.get(newDraft.propertyId), newDraft.customAddress) || "Select a property or enter a custom address"}
                </div>
              </FormField>

              <FormField label="Custom Address">
                <input
                  value={newDraft.customAddress}
                  onChange={(event) => setNewDraftField("customAddress", event.target.value)}
                  placeholder="Custom address"
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>

              <FormField label="Date">
                <input
                  type="date"
                  value={newDraft.date}
                  onChange={(event) => setNewDraftField("date", event.target.value)}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>

              <FormField label="Unit Type">
                <input
                  value={newDraft.unitType}
                  onChange={(event) => setNewDraftField("unitType", event.target.value)}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>

              <FormField label="Unit Label">
                <input
                  value={newDraft.unitText}
                  onChange={(event) => setNewDraftField("unitText", event.target.value)}
                  placeholder="Unit"
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>

              <FormField label="Unit Number">
                <input
                  value={newDraft.unitNumber}
                  onChange={(event) => setNewDraftField("unitNumber", event.target.value)}
                  placeholder="#"
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>

              <FormField label="Image URL">
                <input
                  value={newDraft.workOrderImageUrl}
                  onChange={(event) => setNewDraftField("workOrderImageUrl", event.target.value)}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <FormField label="Instructions">
                <textarea
                  value={newDraft.instructions}
                  onChange={(event) => setNewDraftField("instructions", event.target.value)}
                  className="h-28 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>

              <FormField label="Notes">
                <textarea
                  value={newDraft.notes}
                  onChange={(event) => setNewDraftField("notes", event.target.value)}
                  className="h-28 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </FormField>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Work Order Items</h3>
                <p className="text-sm text-[var(--foreground)]/70">Pending setup</p>
              </div>

              <div className="overflow-hidden rounded-lg border border-[var(--panel-border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--panel-hover)] text-left">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[var(--panel-border)]">
                      <td colSpan={4} className="px-3 py-6 text-center text-[var(--foreground)]/70">
                        Work order items are pending setup.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={isSavingNew}
                className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createWorkOrder()}
                disabled={isSavingNew}
                className="rounded border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-600 hover:bg-blue-500/20 disabled:opacity-60"
              >
                {isSavingNew ? "Creating..." : "Create Work Order"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
