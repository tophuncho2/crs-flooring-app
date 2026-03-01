"use client"

import { useMemo, useState } from "react"
import { Plus, X } from "lucide-react"

export type ImportHeader = {
  id: string
  importNumber: number | null
  importTag: string | null
  transportType: string | null
  status: string | null
  warehouseId: string | null
  warehouseName: string | null
  totalCost: string
  lineCount: number
  createdAt: string
}

export type ImportWarehouse = { id: string; name: string }
export type ImportProduct = { id: string; label: string; categoryName: string | null; manufacturer: string | null; stockUnit: string | null }
export type ImportLocation = { id: string; label: string; warehouseId: string; warehouseName: string; sectionName: string | null }

export type ImportLine = {
  id: string
  importBatchId: string
  importStatus: string | null
  productId: string
  categoryName: string | null
  manufacturer: string | null
  warehouseId: string | null
  sectionName: string | null
  locationId: string | null
  locationCode: string | null
  itemNumber: string | null
  dyeLot: string | null
  stockCount: string
  stockUnit: string | null
  cost: string
  freight: string
  updatedAt: string
}

type LineForm = {
  productId: string
  locationId: string
  itemNumber: string
  dyeLot: string
  stockCount: string
  cost: string
  freight: string
}

function isValidNumber(value: string, scale: number): boolean {
  const normalized = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return false
  return (normalized.split(".")[1]?.length ?? 0) <= scale
}

function fmt(value: string, scale: number): string {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? value : parsed.toFixed(scale)
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-7xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]" type="button">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function ImportsClient({
  initialImports,
  warehouses,
  products,
  locations,
  initialLines,
}: {
  initialImports: ImportHeader[]
  warehouses: ImportWarehouse[]
  products: ImportProduct[]
  locations: ImportLocation[]
  initialLines: ImportLine[]
}) {
  const [imports, setImports] = useState(initialImports)
  const [lines, setLines] = useState(initialLines)
  const [activeImportId, setActiveImportId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [headerForm, setHeaderForm] = useState({
    transportType: "PURCHASE_ORDER",
    status: "PENDING",
    warehouseId: warehouses[0]?.id ?? "",
  })

  const [lineForm, setLineForm] = useState<LineForm>({
    productId: products[0]?.id ?? "",
    locationId: "",
    itemNumber: "",
    dyeLot: "",
    stockCount: "0.0000",
    cost: "0.00",
    freight: "0.00",
  })

  const activeImport = imports.find((row) => row.id === activeImportId) ?? null
  const activeWarehouseId = activeImport?.warehouseId ?? null
  const activeLines = useMemo(() => lines.filter((row) => row.importBatchId === activeImportId), [lines, activeImportId])
  const filteredLocations = useMemo(() => {
    if (!activeWarehouseId) return locations
    return locations.filter((loc) => loc.warehouseId === activeWarehouseId)
  }, [locations, activeWarehouseId])

  async function createImport() {
    if (!headerForm.warehouseId) return

    const response = await fetch("/api/flooring/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transportType: headerForm.transportType,
        status: headerForm.status,
        warehouseId: headerForm.warehouseId,
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      importBatch?: ImportHeader & { warehouse?: { name: string } | null; _count?: { inventory: number } }
    }

    if (!response.ok || !payload.importBatch) {
      setError(payload.error ?? "Failed to create import")
      return
    }

    const created: ImportHeader = {
      id: payload.importBatch.id,
      importNumber: payload.importBatch.importNumber,
      importTag: null,
      transportType: payload.importBatch.transportType,
      status: payload.importBatch.status,
      warehouseId: payload.importBatch.warehouseId,
      warehouseName: payload.importBatch.warehouse?.name ?? null,
      totalCost: "0.00",
      lineCount: payload.importBatch._count?.inventory ?? 0,
      createdAt: payload.importBatch.createdAt,
    }

    setImports((prev) => [created, ...prev])
    setActiveImportId(created.id)
    setIsCreateOpen(false)
    setMessage("Import created")
    setError("")
  }

  async function updateImport(importId: string, patch: Partial<ImportHeader>) {
    const row = imports.find((item) => item.id === importId)
    if (!row) return

    const response = await fetch(`/api/flooring/imports/${importId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transportType: patch.transportType ?? row.transportType,
        status: patch.status ?? row.status,
        warehouseId: patch.warehouseId ?? row.warehouseId,
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      importBatch?: ImportHeader & { warehouse?: { name: string } | null }
    }

    if (!response.ok || !payload.importBatch) {
      setError(payload.error ?? "Failed to update import")
      return
    }

    setImports((prev) =>
      prev.map((item) =>
        item.id === importId
          ? {
              ...item,
              transportType: payload.importBatch?.transportType ?? item.transportType,
              status: payload.importBatch?.status ?? item.status,
              warehouseId: payload.importBatch?.warehouseId ?? item.warehouseId,
              warehouseName: payload.importBatch?.warehouse?.name ?? item.warehouseName,
            }
          : item,
      ),
    )
    setMessage("Import updated")
    setError("")
  }

  async function addLineItem() {
    if (!activeImportId) return
    if (!lineForm.productId) return
    if (!isValidNumber(lineForm.stockCount, 4) || !isValidNumber(lineForm.cost, 2) || !isValidNumber(lineForm.freight, 2)) {
      setError("Invalid line values")
      return
    }

    const response = await fetch("/api/flooring/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importBatchId: activeImportId,
        productId: lineForm.productId,
        locationId: lineForm.locationId || null,
        itemNumber: lineForm.itemNumber,
        dyeLot: lineForm.dyeLot,
        stockCount: fmt(lineForm.stockCount, 4),
        cost: fmt(lineForm.cost, 2),
        freight: fmt(lineForm.freight, 2),
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      lot?: {
        id: string
        importBatchId: string | null
        importBatch?: { status: string | null } | null
        productId: string
        product?: { category?: { name?: string | null } | null; manufacturer?: string | null } | null
        warehouseId: string | null
        locationId: string | null
        location?: { locationCode?: string | null } | null
        itemNumber: string | null
        dyeLot: string | null
        stockCount: string
        stockUnit: string | null
        cost: string | null
        freight: string | null
        updatedAt: string
      }
    }

    if (!response.ok || !payload.lot || !payload.lot.importBatchId) {
      setError(payload.error ?? "Failed to add line")
      return
    }

    const added: ImportLine = {
      id: payload.lot.id,
      importBatchId: payload.lot.importBatchId,
      importStatus: payload.lot.importBatch?.status ?? null,
      productId: payload.lot.productId,
      categoryName: payload.lot.product?.category?.name ?? null,
      manufacturer: payload.lot.product?.manufacturer ?? null,
      warehouseId: payload.lot.warehouseId,
      sectionName: null,
      locationId: payload.lot.locationId,
      locationCode: payload.lot.location?.locationCode ?? null,
      itemNumber: payload.lot.itemNumber,
      dyeLot: payload.lot.dyeLot,
      stockCount: payload.lot.stockCount,
      stockUnit: payload.lot.stockUnit,
      cost: payload.lot.cost ?? "0.00",
      freight: payload.lot.freight ?? "0.00",
      updatedAt: payload.lot.updatedAt,
    }

    setLines((prev) => [added, ...prev])
    setImports((prev) => prev.map((row) => (row.id === activeImportId ? { ...row, lineCount: row.lineCount + 1 } : row)))
    setLineForm((prev) => ({ ...prev, itemNumber: "", dyeLot: "", stockCount: "0.0000", cost: "0.00", freight: "0.00" }))
    setMessage("Line added")
    setError("")
  }

  async function saveLine(row: ImportLine) {
    const response = await fetch(`/api/flooring/inventory/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemNumber: row.itemNumber,
        dyeLot: row.dyeLot,
        stockCount: fmt(row.stockCount, 4),
        cost: fmt(row.cost, 2),
        freight: fmt(row.freight, 2),
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      lot?: {
        itemNumber?: string | null
        dyeLot?: string | null
        stockCount?: string
        cost?: string | null
        freight?: string | null
        importStatus?: string | null
      }
    }

    if (!response.ok) {
      setError(payload.error ?? "Failed to save line")
      return
    }

    setLines((prev) =>
      prev.map((line) =>
        line.id === row.id
          ? {
              ...line,
              itemNumber: payload.lot?.itemNumber ?? line.itemNumber,
              dyeLot: payload.lot?.dyeLot ?? line.dyeLot,
              stockCount: payload.lot?.stockCount ?? line.stockCount,
              cost: payload.lot?.cost ?? line.cost,
              freight: payload.lot?.freight ?? line.freight,
              importStatus: payload.lot?.importStatus ?? line.importStatus,
            }
          : line,
      ),
    )
    setMessage("Line updated")
    setError("")
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)]">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Imports</h1>
            <p className="text-sm text-[var(--foreground)]/70">Click any import row to open its inventory line items.</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-3 py-2 font-semibold text-black transition hover:bg-blue-400"
          >
            <Plus size={14} />
            Add Import
          </button>
        </div>

        {message && <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p>}
        {error && <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Row #</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Warehouse</th>
                  <th className="px-3 py-2">Line Items</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((row, index) => (
                  <tr
                    key={row.id}
                    onClick={() => setActiveImportId(row.id)}
                    className="cursor-pointer border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]"
                  >
                    <td className="px-3 py-2">{row.importNumber ?? index + 1}</td>
                    <td className="px-3 py-2">{row.transportType ?? "-"}</td>
                    <td className="px-3 py-2">{row.status ?? "-"}</td>
                    <td className="px-3 py-2">{row.warehouseName ?? "-"}</td>
                    <td className="px-3 py-2">{row.lineCount}</td>
                    <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {imports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[var(--foreground)]/70" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isCreateOpen && (
        <ModalShell title="Add Import" onClose={() => setIsCreateOpen(false)}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <select value={headerForm.transportType} onChange={(e) => setHeaderForm((p) => ({ ...p, transportType: e.target.value }))} className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2">
              <option value="TRANSFER_WAREHOUSE">Transfer Warehouse</option>
              <option value="WAREHOUSE_RETURN">Warehouse Return</option>
              <option value="PURCHASE_ORDER">Purchase Order</option>
            </select>
            <select value={headerForm.status} onChange={(e) => setHeaderForm((p) => ({ ...p, status: e.target.value }))} className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2">
              <option value="PENDING">Pending</option>
              <option value="SHIPPED">Shipped</option>
              <option value="RECEIVED">Received</option>
              <option value="FINAL">Final</option>
            </select>
            <select value={headerForm.warehouseId} onChange={(e) => setHeaderForm((p) => ({ ...p, warehouseId: e.target.value }))} className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2">
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setIsCreateOpen(false)} type="button" className="rounded border border-[var(--panel-border)] px-3 py-1">
              Cancel
            </button>
            <button
              onClick={createImport}
              disabled={!headerForm.warehouseId}
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-blue-500 px-3 py-2 font-semibold text-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} />
              Create
            </button>
          </div>
        </ModalShell>
      )}

      {activeImport && (
        <ModalShell title={`Import Row ${activeImport.importNumber ?? "-"} Inventory`} onClose={() => setActiveImportId(null)}>
          <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            <select
              value={activeImport.transportType ?? "PURCHASE_ORDER"}
              onChange={(e) => {
                const value = e.target.value
                setImports((prev) => prev.map((r) => (r.id === activeImport.id ? { ...r, transportType: value } : r)))
                updateImport(activeImport.id, { transportType: value })
              }}
              className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
            >
              <option value="TRANSFER_WAREHOUSE">Transfer Warehouse</option>
              <option value="WAREHOUSE_RETURN">Warehouse Return</option>
              <option value="PURCHASE_ORDER">Purchase Order</option>
            </select>
            <select
              value={activeImport.status ?? "PENDING"}
              onChange={(e) => {
                const value = e.target.value
                setImports((prev) => prev.map((r) => (r.id === activeImport.id ? { ...r, status: value } : r)))
                updateImport(activeImport.id, { status: value })
              }}
              className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
            >
              <option value="PENDING">Pending</option>
              <option value="SHIPPED">Shipped</option>
              <option value="RECEIVED">Received</option>
              <option value="FINAL">Final</option>
            </select>
            <select
              value={activeImport.warehouseId ?? ""}
              onChange={(e) => {
                const value = e.target.value
                setImports((prev) => prev.map((r) => (r.id === activeImport.id ? { ...r, warehouseId: value } : r)))
                setLineForm((prev) => ({ ...prev, locationId: "" }))
                updateImport(activeImport.id, { warehouseId: value })
              }}
              className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
            >
              <option value="">No warehouse</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-7">
            <select value={lineForm.productId} onChange={(e) => setLineForm((p) => ({ ...p, productId: e.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
              {products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <input value={lineForm.itemNumber} onChange={(e) => setLineForm((p) => ({ ...p, itemNumber: e.target.value }))} placeholder="Item #" className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
            <input value={lineForm.dyeLot} onChange={(e) => setLineForm((p) => ({ ...p, dyeLot: e.target.value }))} placeholder="Dye Lot" className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
            <select value={lineForm.locationId} onChange={(e) => setLineForm((p) => ({ ...p, locationId: e.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
              <option value="">No Location</option>
              {filteredLocations.map((loc) => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
            </select>
            <input value={lineForm.stockCount} onChange={(e) => setLineForm((p) => ({ ...p, stockCount: e.target.value }))} placeholder="Stock" className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
            <input value={lineForm.cost} onChange={(e) => setLineForm((p) => ({ ...p, cost: e.target.value }))} placeholder="Cost" className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
            <div className="flex gap-2">
              <input value={lineForm.freight} onChange={(e) => setLineForm((p) => ({ ...p, freight: e.target.value }))} placeholder="Freight" className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
              <button onClick={addLineItem} type="button" className="rounded border border-[var(--panel-border)] px-3 py-1">Add</button>
            </div>
          </div>

          <div className="max-h-[55vh] overflow-auto rounded border border-[var(--panel-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-2 py-2">Product</th>
                  <th className="px-2 py-2">Item #</th>
                  <th className="px-2 py-2">Dye Lot</th>
                  <th className="px-2 py-2">Location</th>
                  <th className="px-2 py-2">Stock</th>
                  <th className="px-2 py-2">Cost</th>
                  <th className="px-2 py-2">Freight</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeLines.map((line) => (
                  <tr key={line.id} className="border-t border-[var(--panel-border)]">
                    <td className="px-2 py-2">{line.productId}</td>
                    <td className="px-2 py-2">
                      <input value={line.itemNumber ?? ""} onChange={(e) => setLines((prev) => prev.map((r) => (r.id === line.id ? { ...r, itemNumber: e.target.value } : r)))} onBlur={() => saveLine(line)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-2 py-2">
                      <input value={line.dyeLot ?? ""} onChange={(e) => setLines((prev) => prev.map((r) => (r.id === line.id ? { ...r, dyeLot: e.target.value } : r)))} onBlur={() => saveLine(line)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-2 py-2">{line.locationCode ?? "-"}</td>
                    <td className="px-2 py-2">
                      <input value={line.stockCount} onChange={(e) => setLines((prev) => prev.map((r) => (r.id === line.id ? { ...r, stockCount: e.target.value } : r)))} onBlur={() => saveLine(line)} className="w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-2 py-2">
                      <input value={line.cost} onChange={(e) => setLines((prev) => prev.map((r) => (r.id === line.id ? { ...r, cost: e.target.value } : r)))} onBlur={() => saveLine(line)} className="w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-2 py-2">
                      <input value={line.freight} onChange={(e) => setLines((prev) => prev.map((r) => (r.id === line.id ? { ...r, freight: e.target.value } : r)))} onBlur={() => saveLine(line)} className="w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-2 py-2">{line.importStatus ?? "-"}</td>
                  </tr>
                ))}
                {activeLines.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-2 py-8 text-center text-[var(--foreground)]/70">No line items for this import.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
