"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"

type ProductOption = {
  id: string
  name: string
  measureUnit: string | null
  unitOfMeasure: string
  customerPrice: string
}

type JobInfo = {
  propertyAddress: string
  propertyContact: string
  unitNumber: string
  jobName: string
  jobAddress: string
  notes: string
}

type EstimatorRow = {
  room: string
  productId: string
  quantity: number
  unitOfMeasure: string
  measureUnit?: string
}

const defaultJobInfo: JobInfo = {
  propertyAddress: "",
  propertyContact: "",
  unitNumber: "",
  jobName: "",
  jobAddress: "",
  notes: "",
}

const defaultRow: EstimatorRow = {
  room: "General",
  productId: "",
  quantity: 1,
  unitOfMeasure: "",
  measureUnit: "",
}

function normalizeRoom(room: string): string {
  return room.trim() === "" ? "Unassigned" : room.trim()
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

export default function EstimatorClient({ products }: { products: ProductOption[] }) {
  const [jobInfo, setJobInfo] = useState<JobInfo>(defaultJobInfo)
  // Do not include in PDF output (future step)
  const [markupPercentage, setMarkupPercentage] = useState<string>("")
  const [rows, setRows] = useState<EstimatorRow[]>([defaultRow])
  const [showAddRoomForm, setShowAddRoomForm] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")

  const productsById = useMemo(() => {
    const map = new Map<string, ProductOption>()
    for (const product of products) {
      map.set(product.id, product)
    }
    return map
  }, [products])

  const groupedRows = useMemo(() => {
    const groups = new Map<string, Array<{ row: EstimatorRow; index: number }>>()
    rows.forEach((row, index) => {
      const roomName = normalizeRoom(row.room)
      if (!groups.has(roomName)) {
        groups.set(roomName, [])
      }
      groups.get(roomName)?.push({ row, index })
    })
    return Array.from(groups.entries())
  }, [rows])

  const totalCost = rows.reduce((sum, row) => sum + getLineTotal(row), 0)

  function updateJobInfo(field: keyof JobInfo, value: string) {
    setJobInfo((prev) => ({ ...prev, [field]: value }))
  }

  function updateRow(index: number, next: Partial<EstimatorRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...next } : row)))
  }

  function handleProductChange(index: number, productId: string) {
    const product = productsById.get(productId)
    updateRow(index, {
      productId,
      unitOfMeasure: product?.unitOfMeasure ?? "",
      measureUnit: product?.measureUnit ?? "",
    })
  }

  function handleQuantityChange(index: number, value: string) {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
      updateRow(index, { quantity: 0 })
      return
    }
    updateRow(index, { quantity: parsed })
  }

  function addRow(room?: string) {
    setRows((prev) => [
      ...prev,
      {
        ...defaultRow,
        room: room ?? "General",
      },
    ])
  }

  function submitAddRoomForm(event: React.FormEvent) {
    event.preventDefault()
    const roomName = newRoomName.trim()
    if (!roomName) return

    addRow(roomName)
    setNewRoomName("")
    setShowAddRoomForm(false)
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function getCustomerPrice(row: EstimatorRow): number {
    const product = productsById.get(row.productId)
    if (!product) return 0
    const parsed = Number(product.customerPrice)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  function getLineTotal(row: EstimatorRow): number {
    return row.quantity * getCustomerPrice(row)
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-20 text-[var(--foreground)] sm:px-6 sm:pt-24 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <h1 className="text-2xl font-bold text-blue-500">Estimator</h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">Create estimates quickly on mobile or desktop.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Property Address">
              <input
                value={jobInfo.propertyAddress}
                onChange={(event) => updateJobInfo("propertyAddress", event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Property Contact">
              <input
                value={jobInfo.propertyContact}
                onChange={(event) => updateJobInfo("propertyContact", event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Unit Number">
              <input
                value={jobInfo.unitNumber}
                onChange={(event) => updateJobInfo("unitNumber", event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Job Name">
              <input
                value={jobInfo.jobName}
                onChange={(event) => updateJobInfo("jobName", event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Job Address">
              <input
                value={jobInfo.jobAddress}
                onChange={(event) => updateJobInfo("jobAddress", event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Markup Percentage">
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={markupPercentage}
                onChange={(event) => setMarkupPercentage(event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={jobInfo.notes}
                onChange={(event) => updateJobInfo("notes", event.target.value)}
                className="min-h-24 w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base md:col-span-2"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Estimator Rows</h2>
            <button
              type="button"
              onClick={() => setShowAddRoomForm(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
            >
              <Plus size={14} /> Add Room
            </button>
          </div>

          {showAddRoomForm && (
            <form onSubmit={submitAddRoomForm} className="rounded-lg border border-[var(--panel-border)] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={newRoomName}
                  onChange={(event) => setNewRoomName(event.target.value)}
                  placeholder="Room name"
                  className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2 text-base"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
                  >
                    <Plus size={14} /> Save Room
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddRoomForm(false)
                      setNewRoomName("")
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm transition hover:bg-[var(--panel-hover)]"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="hidden md:block">
            {groupedRows.map(([roomName, roomRows]) => (
              <div key={roomName} className="mb-5 overflow-hidden rounded-lg border border-[var(--panel-border)]">
                <div className="bg-[var(--panel-hover)] px-3 py-2 text-sm font-semibold">Room: {roomName}</div>
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--panel-hover)]/60 text-left">
                    <tr>
                      <th className="px-3 py-2">Room</th>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2">Measure Unit</th>
                      <th className="px-3 py-2">Customer Price</th>
                      <th className="px-3 py-2">Line Total</th>
                      <th className="px-3 py-2">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRows.map(({ row, index }) => (
                      <tr key={`${roomName}-${index}`} className="border-t border-[var(--panel-border)]">
                        <td className="px-3 py-2">
                          <input
                            value={row.room}
                            onChange={(event) => updateRow(index, { room: event.target.value })}
                            className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.productId}
                            onChange={(event) => handleProductChange(index, event.target.value)}
                            className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
                          >
                            <option value="">Select Product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={Number.isFinite(row.quantity) ? row.quantity : 0}
                            onChange={(event) => handleQuantityChange(index, event.target.value)}
                            className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
                          />
                        </td>
                        <td className="px-3 py-2">{row.unitOfMeasure || "-"}</td>
                        <td className="px-3 py-2">{row.measureUnit || "-"}</td>
                        <td className="px-3 py-2">{formatCurrency(getCustomerPrice(row))}</td>
                        <td className="px-3 py-2">{formatCurrency(getLineTotal(row))}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="rounded-md p-2 text-rose-600 transition hover:bg-rose-500/10"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-start border-t border-[var(--panel-border)] p-2">
                  <button
                    type="button"
                    onClick={() => addRow(roomName)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm transition hover:bg-[var(--panel-hover)]"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 md:hidden">
            {groupedRows.map(([roomName, roomRows]) => (
              <div key={roomName} className="space-y-3">
                <h3 className="text-sm font-semibold text-blue-500">Room: {roomName}</h3>
                {roomRows.map(({ row, index }) => (
                  <div key={`${roomName}-${index}`} className="space-y-3 rounded-lg border border-[var(--panel-border)] p-3">
                    <Field label="Room">
                      <input
                        value={row.room}
                        onChange={(event) => updateRow(index, { room: event.target.value })}
                        className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
                      />
                    </Field>
                    <Field label="Product">
                      <select
                        value={row.productId}
                        onChange={(event) => handleProductChange(index, event.target.value)}
                        className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
                      >
                        <option value="">Select Product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Quantity">
                      <input
                        type="number"
                        step="0.01"
                        value={Number.isFinite(row.quantity) ? row.quantity : 0}
                        onChange={(event) => handleQuantityChange(index, event.target.value)}
                        className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
                      />
                    </Field>
                    <Field label="Unit of Measure">
                      <input
                        value={row.unitOfMeasure}
                        readOnly
                        className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-hover)]/40 px-3 py-3 text-base"
                      />
                    </Field>
                    <Field label="Measure Unit">
                      <input
                        value={row.measureUnit ?? ""}
                        readOnly
                        className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-hover)]/40 px-3 py-3 text-base"
                      />
                    </Field>
                    <Field label="Customer Price">
                      <input
                        value={formatCurrency(getCustomerPrice(row))}
                        readOnly
                        className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-hover)]/40 px-3 py-3 text-base"
                      />
                    </Field>
                    <Field label="Line Total">
                      <input
                        value={formatCurrency(getLineTotal(row))}
                        readOnly
                        className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-hover)]/40 px-3 py-3 text-base"
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-600"
                    >
                      <Trash2 size={14} /> Remove Row
                    </button>
                  </div>
                ))}
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => addRow(roomName)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm transition hover:bg-[var(--panel-hover)]"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Total Cost</span>
              <input
                readOnly
                value={formatCurrency(totalCost)}
                className="w-44 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-right font-semibold"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--panel-border)] bg-[var(--panel-background)] p-3">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            className="w-full rounded-lg bg-blue-500 px-4 py-3 text-base font-semibold text-black transition hover:bg-blue-400"
            onClick={() => {
              console.log({ jobInfo, markupPercentage, rows })
              alert("Estimate confirmed in UI state. Backend save is not implemented yet.")
            }}
          >
            Confirm Estimate
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}
