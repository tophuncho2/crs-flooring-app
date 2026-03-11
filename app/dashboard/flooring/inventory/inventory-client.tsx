"use client"

import Link from "next/link"
import { type ReactNode, useMemo, useState } from "react"
import { X } from "lucide-react"

type CutLogRow = {
  id: string
  inventoryId: string
  inventoryLabel: string
  itemNumber: string
  quantityTaken: string
  notes: string
  createdAt: string
}

type InventoryRow = {
  id: string
  importEntryId: string
  importNumber: string
  importTag: string
  importStatus: string
  importTransportType: string
  importWarehouseName: string
  productId: string
  productName: string
  stockUnit: string
  itemNumber: string
  dyeLot: string
  locationId: string
  locationCode: string
  warehouseName: string
  sectionName: string
  stockCount: string
  cutTotal: string
  runningBalance: string
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
  cutLogs: CutLogRow[]
}

type CutLogDraft = {
  quantityTaken: string
  notes: string
}

const emptyCutLogDraft: CutLogDraft = {
  quantityTaken: "",
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

function parseDecimal(value: string) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function formatSignedValue(value: string) {
  const numeric = parseDecimal(value)
  if (numeric > 0) return `-${numeric.toFixed(2)}`
  if (numeric < 0) return `+${Math.abs(numeric).toFixed(2)}`
  return "0.00"
}

function formatTransportType(value: string) {
  if (!value) return "-"
  return value === "RETURN" ? "Return" : "Purchase Order"
}

function formatImportStatus(value: string) {
  return value === "PENDING" ? "Pending" : "Final"
}

export default function InventoryClient({ initialInventory }: { initialInventory: InventoryRow[] }) {
  const [rows, setRows] = useState(initialInventory)
  const [activeRowId, setActiveRowId] = useState<string | null>(null)
  const [cutLogDraft, setCutLogDraft] = useState<CutLogDraft>(emptyCutLogDraft)
  const [isSavingCutLog, setIsSavingCutLog] = useState(false)
  const [cutLogError, setCutLogError] = useState("")
  const [cutLogMessage, setCutLogMessage] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const activeRow = useMemo(() => rows.find((row) => row.id === activeRowId) ?? null, [rows, activeRowId])
  const activeRunningBalance = activeRow ? parseDecimal(activeRow.runningBalance) : 0
  const canAddPositiveCut = activeRunningBalance > 0
  const draftQuantity = parseDecimal(cutLogDraft.quantityTaken)
  const canSubmitAdjustment = canAddPositiveCut || draftQuantity < 0

  function openRow(rowId: string) {
    setMessage("")
    setError("")
    setCutLogError("")
    setCutLogMessage("")
    setCutLogDraft(emptyCutLogDraft)
    setActiveRowId(rowId)
  }

  function closeRow() {
    if (isSavingCutLog) return
    setActiveRowId(null)
    setCutLogError("")
    setCutLogMessage("")
    setCutLogDraft(emptyCutLogDraft)
  }

  async function addCutLog() {
    if (!activeRow) return

    setMessage("")
    setCutLogError("")
    setCutLogMessage("")
    setIsSavingCutLog(true)

    try {
      if (!cutLogDraft.quantityTaken.trim()) {
        throw new Error("Enter a cut quantity before saving")
      }

      const quantityTaken = parseDecimal(cutLogDraft.quantityTaken)
      if (quantityTaken === 0) {
        throw new Error("Adjustment quantity must be more than 0 or less than 0")
      }

      if (quantityTaken > 0 && activeRunningBalance <= 0) {
        throw new Error("This inventory row has no running balance left")
      }

      if (quantityTaken > activeRunningBalance) {
        throw new Error("Cut quantity cannot exceed the current running balance")
      }

      const response = await fetch("/api/flooring/cut-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: activeRow.id,
          quantityTaken: cutLogDraft.quantityTaken,
          notes: cutLogDraft.notes,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        cutLog?: CutLogRow
        error?: string
      }

      if (!response.ok || !payload.cutLog) {
        throw new Error(payload.error ?? "Failed to add cut log")
      }

      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== activeRow.id) return row
          const nextCutTotal = parseDecimal(row.cutTotal) + parseDecimal(payload.cutLog!.quantityTaken)
          const nextRunningBalance = parseDecimal(row.stockCount) - nextCutTotal
          return {
            ...row,
            cutLogs: [payload.cutLog!, ...row.cutLogs],
            cutTotal: nextCutTotal.toFixed(2),
            runningBalance: nextRunningBalance.toFixed(2),
          }
        }),
      )
      setCutLogDraft(emptyCutLogDraft)
      setCutLogError("")
      setCutLogMessage("Cut Saved")
      setMessage("Cut log saved")
    } catch (saveError) {
      setCutLogError(saveError instanceof Error ? saveError.message : "Failed to add cut log")
    } finally {
      setIsSavingCutLog(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <h1 className="text-2xl font-bold text-blue-500">Inventory</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/70">
          Live inventory only. Pending import rows stay on the Imports page until the import is marked final.
        </p>

        {message ? <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
          <table className="w-full min-w-[1700px] text-sm">
            <thead className="bg-[var(--panel-hover)] text-left">
              <tr>
                <th className="h-10 px-3 py-2">Open</th>
                <th className="h-10 px-3 py-2">Import #</th>
                <th className="h-10 px-3 py-2">Import Tag</th>
                <th className="h-10 px-3 py-2">Import Status</th>
                <th className="h-10 px-3 py-2">Transport</th>
                <th className="h-10 px-3 py-2">Product</th>
                <th className="h-10 px-3 py-2">Item #</th>
                <th className="h-10 px-3 py-2">Starting Stock</th>
                <th className="h-10 px-3 py-2">Cuts Total</th>
                <th className="h-10 px-3 py-2">Running Balance</th>
                <th className="h-10 px-3 py-2">Location</th>
                <th className="h-10 px-3 py-2">Dye Lot</th>
                <th className="h-10 px-3 py-2">Cost $</th>
                <th className="h-10 px-3 py-2">Freight $</th>
                <th className="h-10 px-3 py-2">Import Warehouse</th>
                <th className="h-10 px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--panel-border)]">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openRow(row.id)}
                      className="rounded border border-[var(--panel-border)] px-3 py-1 text-xs hover:bg-[var(--panel-hover)]"
                    >
                      Open
                    </button>
                  </td>
                  <td className="px-3 py-2 font-medium text-blue-500">{row.importNumber ? `IMP-${row.importNumber.padStart(4, "0")}` : "-"}</td>
                  <td className="px-3 py-2">{row.importTag || "-"}</td>
                  <td className="px-3 py-2">{formatImportStatus(row.importStatus)}</td>
                  <td className="px-3 py-2">{formatTransportType(row.importTransportType)}</td>
                  <td className="px-3 py-2">{row.productName}</td>
                  <td className="px-3 py-2">{row.itemNumber}</td>
                  <td className="px-3 py-2">
                    {row.stockCount} {row.stockUnit || ""}
                  </td>
                  <td className="px-3 py-2">{row.cutTotal}</td>
                  <td className="px-3 py-2 font-semibold">
                    {row.runningBalance} {row.stockUnit || ""}
                  </td>
                  <td className="px-3 py-2">
                    {row.warehouseName}
                    {row.sectionName ? ` / ${row.sectionName}` : ""}
                    {row.locationCode ? ` / ${row.locationCode}` : ""}
                  </td>
                  <td className="px-3 py-2">{row.dyeLot || "-"}</td>
                  <td className="px-3 py-2">{row.cost || "-"}</td>
                  <td className="px-3 py-2">{row.freight || "-"}</td>
                  <td className="px-3 py-2">{row.importWarehouseName || row.warehouseName}</td>
                  <td className="px-3 py-2">{row.notes || "-"}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                    No live inventory rows yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {activeRow ? (
        <ModalShell title={`Inventory Row ${activeRow.itemNumber}`} onClose={closeRow}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Item #</p>
                <p className="mt-1 font-medium">{activeRow.itemNumber}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Dye Lot</p>
                <p className="mt-1 font-medium">{activeRow.dyeLot || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Location</p>
                <p className="mt-1 font-medium">
                  {activeRow.warehouseName}
                  {activeRow.sectionName ? ` / ${activeRow.sectionName}` : ""}
                  {activeRow.locationCode ? ` / ${activeRow.locationCode}` : ""}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Product</p>
                <p className="mt-1 font-medium">{activeRow.productName}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Starting Stock</p>
                <p className="mt-1 font-medium">
                  {activeRow.stockCount} {activeRow.stockUnit}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Cuts Total</p>
                <p className="mt-1 font-medium">{activeRow.cutTotal}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Running Balance</p>
                <p className="mt-1 font-medium text-blue-500">
                  {activeRow.runningBalance} {activeRow.stockUnit}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Cut Logs</h3>
                <p className="text-sm text-[var(--foreground)]/70">Enter the cut quantity to reduce stock. It cannot exceed the remaining running balance.</p>
              </div>
              <Link href="/dashboard/flooring/cut-logs" className="text-sm text-blue-500 hover:underline">
                Open Cut Logs Table
              </Link>
            </div>

            <div className="rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
              <div className="grid gap-4 md:grid-cols-[220px,minmax(0,1fr),auto] md:items-end">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-[var(--foreground)]/80">Cut Quantity</span>
                  <input
                    value={cutLogDraft.quantityTaken}
                    onChange={(event) => setCutLogDraft((prev) => ({ ...prev, quantityTaken: event.target.value }))}
                    placeholder="Enter cut amount"
                    className="rounded-lg border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-[var(--foreground)]/80">Notes</span>
                  <input
                    value={cutLogDraft.notes}
                    onChange={(event) => setCutLogDraft((prev) => ({ ...prev, notes: event.target.value }))}
                    className="rounded-lg border border-[color:var(--subpanel-border)] bg-[var(--subpanel-input-background)] px-3 py-2"
                  />
                </label>
                <div className="flex items-center justify-end gap-3">
                  {cutLogError ? <p className="text-right text-sm text-rose-600">{cutLogError}</p> : null}
                  {!cutLogError && cutLogMessage ? <p className="text-right text-sm text-emerald-600">{cutLogMessage}</p> : null}
                  <button
                    type="button"
                    onClick={() => void addCutLog()}
                    disabled={isSavingCutLog || !canSubmitAdjustment}
                    className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60 md:w-auto"
                  >
                    {isSavingCutLog ? "Saving..." : canSubmitAdjustment ? "Add Cut" : "Balance at 0"}
                  </button>
                </div>
              </div>
            </div>

            {!canAddPositiveCut ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
                Running balance is 0. No additional cuts can be added for this inventory row.
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[var(--subpanel-header-background)] text-left">
                  <tr>
                    <th className="h-10 px-3 py-2">Created</th>
                    <th className="h-10 px-3 py-2">Adjustment</th>
                    <th className="h-10 px-3 py-2">Effect on Stock</th>
                    <th className="h-10 px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRow.cutLogs.map((log) => (
                    <tr key={log.id} className="border-t border-[var(--panel-border)]">
                      <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">{log.quantityTaken}</td>
                      <td className="px-3 py-2">{formatSignedValue(log.quantityTaken)}</td>
                      <td className="px-3 py-2">{log.notes || "-"}</td>
                    </tr>
                  ))}
                  {activeRow.cutLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                        No cut logs yet for this inventory row.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
