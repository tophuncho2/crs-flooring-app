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

type SavedEstimateItem = {
  room: string
  productId: string
  quantity: string
  unitOfMeasure: string
  altUnitOfMeasure: string | null
}

type SavedEstimate = {
  id: string
  propertyAddress: string
  propertyContact: string
  unitNumber: string
  jobName: string
  jobAddress: string
  notes: string | null
  markupPercentage: string
  createdAt: string
  customerFileName: string | null
  customerFileAt: string | null
  items: SavedEstimateItem[]
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

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function EstimatorClient({ products }: { products: ProductOption[] }) {
  const [jobInfo, setJobInfo] = useState<JobInfo>(defaultJobInfo)
  const [markupPercentage, setMarkupPercentage] = useState<string>("")
  const [rows, setRows] = useState<EstimatorRow[]>([defaultRow])
  const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null)
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>([])
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloadingFile, setIsDownloadingFile] = useState(false)
  const [showAddRoomForm, setShowAddRoomForm] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [activeEstimateFileName, setActiveEstimateFileName] = useState<string | null>(null)

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

  const baseTotal = rows.reduce((sum, row) => sum + getLineTotal(row), 0)
  const markupValue = Number(markupPercentage)
  const normalizedMarkup = Number.isFinite(markupValue) ? markupValue : 0
  const totalCost = baseTotal + baseTotal * (normalizedMarkup / 100)

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

  async function loadSavedEstimates() {
    setError("")
    try {
      const response = await fetch("/api/estimates", { cache: "no-store" })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        estimates?: Array<{
          id: string
          propertyAddress: string
          propertyContact: string
          unitNumber: string
          jobName: string
          jobAddress: string
          notes: string | null
          markupPercentage: string | number
          createdAt: string
          customerFileName: string | null
          customerFileAt: string | null
          items: Array<{
            room: string
            productId: string
            quantity: string | number
            unitOfMeasure: string
            altUnitOfMeasure: string | null
          }>
        }>
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load saved estimates")
      }

      const mapped: SavedEstimate[] = (payload.estimates ?? []).map((estimate) => ({
        id: estimate.id,
        propertyAddress: estimate.propertyAddress,
        propertyContact: estimate.propertyContact,
        unitNumber: estimate.unitNumber,
        jobName: estimate.jobName,
        jobAddress: estimate.jobAddress,
        notes: estimate.notes,
        markupPercentage: String(estimate.markupPercentage ?? "0"),
        createdAt: estimate.createdAt,
        customerFileName: estimate.customerFileName,
        customerFileAt: estimate.customerFileAt,
        items: estimate.items.map((item) => ({
          room: item.room,
          productId: item.productId,
          quantity: String(item.quantity),
          unitOfMeasure: item.unitOfMeasure,
          altUnitOfMeasure: item.altUnitOfMeasure,
        })),
      }))

      setSavedEstimates(mapped)
      setIsSavedModalOpen(true)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load saved estimates")
    }
  }

  function openSavedEstimate(estimate: SavedEstimate) {
    setJobInfo({
      propertyAddress: estimate.propertyAddress,
      propertyContact: estimate.propertyContact,
      unitNumber: estimate.unitNumber,
      jobName: estimate.jobName,
      jobAddress: estimate.jobAddress,
      notes: estimate.notes ?? "",
    })
    setMarkupPercentage(estimate.markupPercentage)
    setRows(
      estimate.items.length > 0
        ? estimate.items.map((item) => ({
            room: item.room,
            productId: item.productId,
            quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0,
            unitOfMeasure: item.unitOfMeasure,
            measureUnit: item.altUnitOfMeasure ?? "",
          }))
        : [defaultRow],
    )
    setActiveEstimateId(estimate.id)
    setActiveEstimateFileName(estimate.customerFileName)
    setIsSavedModalOpen(false)
    setMessage("Saved estimate loaded")
    setError("")
  }

  async function downloadCustomerFile(estimateId: string, fileName?: string | null) {
    setIsDownloadingFile(true)
    setError("")

    try {
      const response = await fetch(`/api/estimates/${estimateId}/customer-file`, {
        method: "GET",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? "Failed to download customer estimate file")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = fileName ?? `estimate-${estimateId}-customer-estimate.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Failed to download customer estimate file")
    } finally {
      setIsDownloadingFile(false)
    }
  }

  async function saveEstimate() {
    setIsSaving(true)
    setError("")
    setMessage("")

    try {
      const body = {
        ...jobInfo,
        markupPercentage: markupPercentage.trim() === "" ? "0" : markupPercentage,
        rows,
      }
      const endpoint = activeEstimateId ? `/api/estimates/${activeEstimateId}` : "/api/estimates"
      const method = activeEstimateId ? "PATCH" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        estimate?: { id: string; customerFileName?: string | null }
      }

      if (!response.ok || !payload.estimate) {
        throw new Error(payload.error ?? "Failed to save estimate")
      }

      setActiveEstimateId(payload.estimate.id)
      setActiveEstimateFileName(payload.estimate.customerFileName ?? null)
      setMessage(activeEstimateId ? "Estimate updated" : "Estimate saved")
      await downloadCustomerFile(payload.estimate.id, payload.estimate.customerFileName)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save estimate")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-28 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="w-full space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-blue-500">Estimator</h1>
              <p className="mt-1 text-sm text-[var(--foreground)]/70">Create estimates quickly on mobile or desktop.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeEstimateId && activeEstimateFileName && (
                <button
                  type="button"
                  onClick={() => void downloadCustomerFile(activeEstimateId, activeEstimateFileName)}
                  className="rounded-lg border border-blue-500/40 px-3 py-2 text-sm text-blue-500 transition hover:bg-blue-500/10 disabled:opacity-60"
                  disabled={isDownloadingFile}
                >
                  {isDownloadingFile ? "Downloading..." : "Download Customer File"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void loadSavedEstimates()}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm transition hover:bg-[var(--panel-hover)]"
              >
                Saved Estimates
              </button>
            </div>
          </div>

          {message && (
            <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

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
            <div className="flex flex-wrap items-end justify-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--foreground)]/80">Markup %</span>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={markupPercentage}
                  onChange={(event) => setMarkupPercentage(event.target.value)}
                  className="w-32 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-right"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--foreground)]/80">Total Cost</span>
                <input
                  readOnly
                  value={formatCurrency(totalCost)}
                  className="w-44 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-right font-semibold"
                />
              </label>
            </div>
          </div>
        </section>
      </div>

      {isSavedModalOpen && (
        <ModalShell title="Saved Estimates" onClose={() => setIsSavedModalOpen(false)}>
          <div className="max-h-[65vh] overflow-auto rounded-lg border border-[var(--panel-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Job</th>
                  <th className="px-3 py-2">Property</th>
                  <th className="px-3 py-2">Rows</th>
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {savedEstimates.map((estimate) => (
                  <tr
                    key={estimate.id}
                    onClick={() => openSavedEstimate(estimate)}
                    className="cursor-pointer border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]"
                  >
                    <td className="px-3 py-2">{estimate.jobName || "Untitled Job"}</td>
                    <td className="px-3 py-2">{estimate.propertyAddress || "-"}</td>
                    <td className="px-3 py-2">{estimate.items.length}</td>
                    <td className="px-3 py-2">
                      {estimate.customerFileName ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void downloadCustomerFile(estimate.id, estimate.customerFileName)
                          }}
                          className="rounded-md border border-blue-500/40 px-2 py-1 text-xs text-blue-500 hover:bg-blue-500/10"
                        >
                          Download
                        </button>
                      ) : (
                        <span className="text-[var(--foreground)]/60">No file</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{new Date(estimate.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {savedEstimates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No saved estimates.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--panel-border)] bg-[var(--panel-background)] p-3">
        <div className="w-full px-1 sm:px-2 lg:px-3">
          <button
            type="button"
            className="w-full rounded-lg bg-blue-500 px-4 py-3 text-base font-semibold text-black transition hover:bg-blue-400"
            onClick={() => void saveEstimate()}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : activeEstimateId ? "Update Estimate" : "Save Estimate"}
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
