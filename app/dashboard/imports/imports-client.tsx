"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, Plus } from "lucide-react"

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

export type ImportWarehouse = {
  id: string
  name: string
}

export type ImportProduct = {
  id: string
  label: string
  categoryName: string | null
  manufacturer: string | null
  stockUnit: string | null
}

export type ImportLocation = {
  id: string
  label: string
  warehouseId: string
  warehouseName: string
  sectionName: string | null
}

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

type GroupByKey = "product" | "category" | "manufacturer" | "warehouse" | "section" | "location" | "lowStock"

type GroupByState = {
  group1: GroupByKey | ""
  group2: GroupByKey | ""
  group3: GroupByKey | ""
}

type HeaderForm = {
  importTag: string
  transportType: string
  status: string
  warehouseId: string
  totalCost: string
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

const LOW_STOCK_THRESHOLD = 5

function hasLowStock(stockCount: string) {
  return Number(stockCount) <= LOW_STOCK_THRESHOLD
}

function isValidNumber(value: string, scale: number): boolean {
  const normalized = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return false
  return (normalized.split(".")[1]?.length ?? 0) <= scale
}

function formatNumber(value: string, scale: number): string {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return value
  return parsed.toFixed(scale)
}

function labelForGroupKey(key: GroupByKey) {
  if (key === "product") return "Product"
  if (key === "category") return "Category"
  if (key === "manufacturer") return "Manufacturer"
  if (key === "warehouse") return "Warehouse"
  if (key === "section") return "Section"
  if (key === "location") return "Location"
  return "Low Stock"
}

function valueForGroupKey(row: ImportLine, key: GroupByKey): string {
  if (key === "product") return row.productId
  if (key === "category") return row.categoryName ?? "Uncategorized"
  if (key === "manufacturer") return row.manufacturer ?? "Unassigned"
  if (key === "warehouse") return row.warehouseId ?? "No Warehouse"
  if (key === "section") return row.sectionName ?? "No Section"
  if (key === "location") return row.locationCode ?? "No Location"
  return hasLowStock(row.stockCount) ? "Low" : "OK"
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
  const router = useRouter()
  const [imports, setImports] = useState(initialImports)
  const [lines, setLines] = useState(initialLines)
  const [activeImportId, setActiveImportId] = useState(initialImports[0]?.id ?? "")
  const [isClipboardMenuOpen, setIsClipboardMenuOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [groupBy, setGroupBy] = useState<GroupByState>({ group1: "", group2: "", group3: "" })

  const [headerForm, setHeaderForm] = useState<HeaderForm>({
    importTag: "",
    transportType: "PURCHASE_ORDER",
    status: "PENDING",
    warehouseId: warehouses[0]?.id ?? "",
    totalCost: "0.00",
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

  const lineDrafts = useMemo(() => {
    const map: Record<string, LineForm> = {}
    for (const line of lines) {
      map[line.id] = {
        productId: line.productId,
        locationId: line.locationId ?? "",
        itemNumber: line.itemNumber ?? "",
        dyeLot: line.dyeLot ?? "",
        stockCount: line.stockCount,
        cost: line.cost,
        freight: line.freight,
      }
    }
    return map
  }, [lines])

  const activeImport = imports.find((row) => row.id === activeImportId) ?? null

  const importLines = useMemo(() => lines.filter((line) => line.importBatchId === activeImportId), [lines, activeImportId])

  const selectedGroups = useMemo(
    () => [groupBy.group1, groupBy.group2, groupBy.group3].filter((value): value is GroupByKey => Boolean(value)),
    [groupBy],
  )

  const groupedLines = useMemo(() => {
    if (selectedGroups.length === 0) return []

    const map = new Map<string, { key: string; values: Record<GroupByKey, string>; stock: number; rows: number }>()

    for (const row of importLines) {
      const parts = selectedGroups.map((group) => valueForGroupKey(row, group))
      const key = parts.join("||")
      const existing = map.get(key)
      if (existing) {
        existing.stock += Number(row.stockCount)
        existing.rows += 1
        continue
      }

      const values = {
        product: "",
        category: "",
        manufacturer: "",
        warehouse: "",
        section: "",
        location: "",
        lowStock: "",
      } as Record<GroupByKey, string>
      for (const group of selectedGroups) values[group] = valueForGroupKey(row, group)

      map.set(key, { key, values, stock: Number(row.stockCount), rows: 1 })
    }

    return Array.from(map.values())
  }, [importLines, selectedGroups])

  const filteredLocations = !activeImport?.warehouseId
    ? locations
    : locations.filter((loc) => loc.warehouseId === activeImport.warehouseId)

  async function createImport() {
    if (!headerForm.warehouseId) {
      setError("Import warehouse is required")
      return
    }
    if (!isValidNumber(headerForm.totalCost, 2)) {
      setError("Total cost must be numeric")
      return
    }

    setError("")
    setMessage("")

    const response = await fetch("/api/flooring/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importTag: headerForm.importTag,
        warehouseId: headerForm.warehouseId,
        transportType: headerForm.transportType,
        status: headerForm.status,
        totalCost: formatNumber(headerForm.totalCost, 2),
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
      importTag: payload.importBatch.importTag,
      transportType: payload.importBatch.transportType,
      status: payload.importBatch.status,
      warehouseId: payload.importBatch.warehouseId,
      warehouseName: payload.importBatch.warehouse?.name ?? null,
      totalCost: payload.importBatch.totalCost,
      lineCount: payload.importBatch._count?.inventory ?? 0,
      createdAt: payload.importBatch.createdAt,
    }

    setImports((prev) => [created, ...prev])
    setActiveImportId(created.id)
    setMessage("Import created")
  }

  async function updateImportField(importId: string, patch: Partial<HeaderForm>) {
    const found = imports.find((row) => row.id === importId)
    if (!found) return

    const requestBody = {
      importTag: patch.importTag ?? found.importTag ?? "",
      transportType: patch.transportType ?? found.transportType ?? "PURCHASE_ORDER",
      status: patch.status ?? found.status ?? "PENDING",
      warehouseId: patch.warehouseId ?? found.warehouseId,
      totalCost: patch.totalCost ?? found.totalCost,
    }

    const response = await fetch(`/api/flooring/imports/${importId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      importBatch?: ImportHeader & { warehouse?: { name: string } | null; _count?: { inventory: number } }
    }

    if (!response.ok || !payload.importBatch) {
      setError(payload.error ?? "Failed to update import")
      return
    }

    setImports((prev) =>
      prev.map((row) =>
        row.id === importId
          ? {
              ...row,
              importTag: payload.importBatch?.importTag ?? row.importTag,
              transportType: payload.importBatch?.transportType ?? row.transportType,
              status: payload.importBatch?.status ?? row.status,
              warehouseId: payload.importBatch?.warehouseId ?? row.warehouseId,
              warehouseName: payload.importBatch?.warehouse?.name ?? row.warehouseName,
              totalCost: payload.importBatch?.totalCost ?? row.totalCost,
              lineCount: payload.importBatch?._count?.inventory ?? row.lineCount,
            }
          : row,
      ),
    )
    setMessage("Import updated")
  }

  async function addLineItem() {
    if (!activeImportId) {
      setError("Create or select an import first")
      return
    }
    if (!lineForm.productId) {
      setError("Product is required")
      return
    }
    if (!isValidNumber(lineForm.stockCount, 4)) {
      setError("Stock must be numeric with up to 4 decimals")
      return
    }
    if (!isValidNumber(lineForm.cost, 2) || !isValidNumber(lineForm.freight, 2)) {
      setError("Cost and freight must be numeric")
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
        stockCount: formatNumber(lineForm.stockCount, 4),
        cost: formatNumber(lineForm.cost, 2),
        freight: formatNumber(lineForm.freight, 2),
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
        location?: { locationCode?: string | null; section?: { name?: string | null } | null } | null
        itemNumber: string | null
        dyeLot: string | null
        stockCount: { toString(): string } | string
        stockUnit: string | null
        cost: { toString(): string } | string | null
        freight: { toString(): string } | string | null
        updatedAt: string
      }
    }

    if (!response.ok || !payload.lot || !payload.lot.importBatchId) {
      setError(payload.error ?? "Failed to add line item")
      return
    }

    const row: ImportLine = {
      id: payload.lot.id,
      importBatchId: payload.lot.importBatchId,
      importStatus: payload.lot.importBatch?.status ?? null,
      productId: payload.lot.productId,
      categoryName: payload.lot.product?.category?.name ?? null,
      manufacturer: payload.lot.product?.manufacturer ?? null,
      warehouseId: payload.lot.warehouseId,
      sectionName: payload.lot.location?.section?.name ?? null,
      locationId: payload.lot.locationId,
      locationCode: payload.lot.location?.locationCode ?? null,
      itemNumber: payload.lot.itemNumber,
      dyeLot: payload.lot.dyeLot,
      stockCount: String(payload.lot.stockCount),
      stockUnit: payload.lot.stockUnit,
      cost: payload.lot.cost ? String(payload.lot.cost) : "0.00",
      freight: payload.lot.freight ? String(payload.lot.freight) : "0.00",
      updatedAt: payload.lot.updatedAt,
    }

    setLines((prev) => [row, ...prev])
    setImports((prev) => prev.map((r) => (r.id === activeImportId ? { ...r, lineCount: r.lineCount + 1 } : r)))
    setMessage("Line item added")
  }

  async function saveLine(row: ImportLine, draft: LineForm) {
    if (!isValidNumber(draft.stockCount, 4)) {
      setError("Stock must be numeric with up to 4 decimals")
      return
    }
    if (!isValidNumber(draft.cost, 2) || !isValidNumber(draft.freight, 2)) {
      setError("Cost and freight must be numeric")
      return
    }

    const response = await fetch(`/api/flooring/inventory/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemNumber: draft.itemNumber,
        dyeLot: draft.dyeLot,
        stockCount: formatNumber(draft.stockCount, 4),
        cost: formatNumber(draft.cost, 2),
        freight: formatNumber(draft.freight, 2),
        locationId: draft.locationId || null,
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
        locationId?: string | null
        locationCode?: string | null
        section?: string | null
        importStatus?: string | null
      }
    }

    if (!response.ok) {
      setError(payload.error ?? "Failed to update line")
      return
    }

    setLines((prev) =>
      prev.map((line) =>
        line.id === row.id
          ? {
              ...line,
              itemNumber: payload.lot?.itemNumber ?? draft.itemNumber,
              dyeLot: payload.lot?.dyeLot ?? draft.dyeLot,
              stockCount: payload.lot?.stockCount ?? formatNumber(draft.stockCount, 4),
              cost: payload.lot?.cost ?? formatNumber(draft.cost, 2),
              freight: payload.lot?.freight ?? formatNumber(draft.freight, 2),
              locationId: payload.lot?.locationId ?? line.locationId,
              locationCode: payload.lot?.locationCode ?? line.locationCode,
              sectionName: payload.lot?.section ?? line.sectionName,
              importStatus: payload.lot?.importStatus ?? line.importStatus,
            }
          : line,
      ),
    )
    setMessage("Line updated")
  }

  function updateGroup(slot: keyof GroupByState, value: string) {
    const nextValue = value as GroupByKey | ""
    const nextState: GroupByState = { ...groupBy, [slot]: nextValue }

    const deduped = [nextState.group1, nextState.group2, nextState.group3]
    const used = new Set<string>()
    const cleaned = deduped.map((entry) => {
      if (!entry) return ""
      if (used.has(entry)) return ""
      used.add(entry)
      return entry
    })

    setGroupBy({
      group1: cleaned[0] as GroupByKey | "",
      group2: cleaned[1] as GroupByKey | "",
      group3: cleaned[2] as GroupByKey | "",
    })
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)]">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Imports</h1>
            <p className="text-sm text-[var(--foreground)]/70">Create import headers and add inventory line items per import.</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsClipboardMenuOpen((prev) => !prev)}
              type="button"
              className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 transition hover:bg-[var(--panel-hover)]"
            >
              <ClipboardList size={18} />
            </button>
            {isClipboardMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] p-1 shadow-lg">
                <button
                  onClick={() => {
                    setIsClipboardMenuOpen(false)
                    router.push("/dashboard/products")
                  }}
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-[var(--panel-hover)]"
                >
                  Products
                </button>
                <button
                  onClick={() => {
                    setIsClipboardMenuOpen(false)
                    router.push("/dashboard/inventory")
                  }}
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-[var(--panel-hover)]"
                >
                  Inventory
                </button>
                <button
                  onClick={() => {
                    setIsClipboardMenuOpen(false)
                    router.push("/dashboard/warehouse")
                  }}
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-[var(--panel-hover)]"
                >
                  Warehouse
                </button>
              </div>
            )}
          </div>
        </div>

        {message && <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p>}
        {error && <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]/75">Import Header</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              value={headerForm.importTag}
              onChange={(event) => setHeaderForm((prev) => ({ ...prev, importTag: event.target.value }))}
              placeholder="Import Tag"
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
            <select
              value={headerForm.transportType}
              onChange={(event) => setHeaderForm((prev) => ({ ...prev, transportType: event.target.value }))}
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
            >
              <option value="TRANSFER_WAREHOUSE">Transfer Warehouse</option>
              <option value="WAREHOUSE_RETURN">Warehouse Return</option>
              <option value="PURCHASE_ORDER">Purchase Order</option>
            </select>
            <select
              value={headerForm.status}
              onChange={(event) => setHeaderForm((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
            >
              <option value="PENDING">Pending</option>
              <option value="SHIPPED">Shipped</option>
              <option value="RECEIVED">Received</option>
              <option value="FINAL">Final</option>
            </select>
            <select
              value={headerForm.warehouseId}
              onChange={(event) => setHeaderForm((prev) => ({ ...prev, warehouseId: event.target.value }))}
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                value={headerForm.totalCost}
                onChange={(event) => setHeaderForm((prev) => ({ ...prev, totalCost: event.target.value }))}
                placeholder="Total Cost"
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
              <button
                onClick={createImport}
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-blue-500 px-3 py-2 font-semibold text-black transition hover:bg-blue-400"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-2 py-2">Active</th>
                  <th className="px-2 py-2">Import #</th>
                  <th className="px-2 py-2">Tag</th>
                  <th className="px-2 py-2">Transport</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Warehouse</th>
                  <th className="px-2 py-2">Created</th>
                  <th className="px-2 py-2">Total Cost</th>
                  <th className="px-2 py-2">Rows</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--panel-border)]">
                    <td className="px-2 py-2">
                      <input
                        type="radio"
                        checked={activeImportId === row.id}
                        onChange={() => setActiveImportId(row.id)}
                      />
                    </td>
                    <td className="px-2 py-2">{row.importNumber ?? "-"}</td>
                    <td className="px-2 py-2">
                      <input
                        value={row.importTag ?? ""}
                        onChange={(event) =>
                          setImports((prev) => prev.map((item) => (item.id === row.id ? { ...item, importTag: event.target.value } : item)))
                        }
                        onBlur={(event) => updateImportField(row.id, { importTag: event.target.value })}
                        className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.transportType ?? "PURCHASE_ORDER"}
                        onChange={(event) => updateImportField(row.id, { transportType: event.target.value })}
                        className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      >
                        <option value="TRANSFER_WAREHOUSE">Transfer Warehouse</option>
                        <option value="WAREHOUSE_RETURN">Warehouse Return</option>
                        <option value="PURCHASE_ORDER">Purchase Order</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.status ?? "PENDING"}
                        onChange={(event) => updateImportField(row.id, { status: event.target.value })}
                        className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="RECEIVED">Received</option>
                        <option value="FINAL">Final</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">{row.warehouseName ?? "-"}</td>
                    <td className="px-2 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-2">
                      <input
                        value={row.totalCost}
                        onChange={(event) =>
                          setImports((prev) => prev.map((item) => (item.id === row.id ? { ...item, totalCost: event.target.value } : item)))
                        }
                        onBlur={(event) => updateImportField(row.id, { totalCost: event.target.value })}
                        className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-2 py-2">{row.lineCount}</td>
                  </tr>
                ))}
                {imports.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-2 py-8 text-center text-[var(--foreground)]/70">
                      No imports yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]/75">Import Line Items</h2>

          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-7">
            <select
              value={lineForm.productId}
              onChange={(event) => setLineForm((prev) => ({ ...prev, productId: event.target.value }))}
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.label}
                </option>
              ))}
            </select>
            <input
              value={lineForm.itemNumber}
              onChange={(event) => setLineForm((prev) => ({ ...prev, itemNumber: event.target.value }))}
              placeholder="Roll / Item #"
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
            />
            <input
              value={lineForm.dyeLot}
              onChange={(event) => setLineForm((prev) => ({ ...prev, dyeLot: event.target.value }))}
              placeholder="Dye Lot"
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
            />
            <select
              value={lineForm.locationId}
              onChange={(event) => setLineForm((prev) => ({ ...prev, locationId: event.target.value }))}
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
            >
              <option value="">No Location</option>
              {filteredLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
            <input
              value={lineForm.stockCount}
              onChange={(event) => setLineForm((prev) => ({ ...prev, stockCount: event.target.value }))}
              placeholder="Stock"
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
            />
            <input
              value={lineForm.cost}
              onChange={(event) => setLineForm((prev) => ({ ...prev, cost: event.target.value }))}
              placeholder="Cost"
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
            />
            <div className="flex gap-2">
              <input
                value={lineForm.freight}
                onChange={(event) => setLineForm((prev) => ({ ...prev, freight: event.target.value }))}
                placeholder="Freight"
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
              />
              <button
                onClick={addLineItem}
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-blue-500 px-3 py-2 font-semibold text-black transition hover:bg-blue-400"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {(["group1", "group2", "group3"] as const).map((slot) => (
              <select
                key={slot}
                value={groupBy[slot]}
                onChange={(event) => updateGroup(slot, event.target.value)}
                className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
              >
                <option value="">{slot.toUpperCase()} - None</option>
                <option value="product">Product</option>
                <option value="category">Category</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="warehouse">Warehouse</option>
                <option value="section">Section</option>
                <option value="location">Location</option>
                <option value="lowStock">Low Stock Identifier</option>
              </select>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)]">
            {selectedGroups.length > 0 ? (
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--panel-hover)] text-left">
                  <tr>
                    {selectedGroups.map((group) => (
                      <th key={group} className="px-2 py-2">
                        {labelForGroupKey(group)}
                      </th>
                    ))}
                    <th className="px-2 py-2">Stock</th>
                    <th className="px-2 py-2">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLines.map((line) => (
                    <tr key={line.key} className="border-t border-[var(--panel-border)]">
                      {selectedGroups.map((group) => (
                        <td key={`${line.key}-${group}`} className="px-2 py-2">
                          {line.values[group]}
                        </td>
                      ))}
                      <td className="px-2 py-2">{line.stock.toFixed(4)}</td>
                      <td className="px-2 py-2">{line.rows}</td>
                    </tr>
                  ))}
                  {groupedLines.length === 0 && (
                    <tr>
                      <td colSpan={selectedGroups.length + 2} className="px-2 py-8 text-center text-[var(--foreground)]/70">
                        No grouped rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--panel-hover)] text-left">
                  <tr>
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Manufacturer</th>
                    <th className="px-2 py-2">Item #</th>
                    <th className="px-2 py-2">Dye Lot</th>
                    <th className="px-2 py-2">Location</th>
                    <th className="px-2 py-2">Section</th>
                    <th className="px-2 py-2">Stock</th>
                    <th className="px-2 py-2">Cost</th>
                    <th className="px-2 py-2">Freight</th>
                    <th className="px-2 py-2">Import Status</th>
                    <th className="px-2 py-2">Last Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {importLines.map((line) => {
                    const draft = lineDrafts[line.id]
                    return (
                      <tr key={line.id} className="border-t border-[var(--panel-border)]">
                        <td className="px-2 py-2">{line.productId}</td>
                        <td className="px-2 py-2">{line.categoryName ?? "Uncategorized"}</td>
                        <td className="px-2 py-2">{line.manufacturer ?? "Unassigned"}</td>
                        <td className="px-2 py-2">
                          <input
                            value={draft.itemNumber}
                            onChange={(event) =>
                              setLines((prev) => prev.map((row) => (row.id === line.id ? { ...row, itemNumber: event.target.value } : row)))
                            }
                            onBlur={(event) => saveLine(line, { ...draft, itemNumber: event.target.value })}
                            className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={draft.dyeLot}
                            onChange={(event) =>
                              setLines((prev) => prev.map((row) => (row.id === line.id ? { ...row, dyeLot: event.target.value } : row)))
                            }
                            onBlur={(event) => saveLine(line, { ...draft, dyeLot: event.target.value })}
                            className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-2 py-2">{line.locationCode ?? "No Location"}</td>
                        <td className="px-2 py-2">{line.sectionName ?? "No Section"}</td>
                        <td className="px-2 py-2">
                          <input
                            value={draft.stockCount}
                            onChange={(event) =>
                              setLines((prev) => prev.map((row) => (row.id === line.id ? { ...row, stockCount: event.target.value } : row)))
                            }
                            onBlur={(event) => saveLine(line, { ...draft, stockCount: event.target.value })}
                            className="w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={draft.cost}
                            onChange={(event) =>
                              setLines((prev) => prev.map((row) => (row.id === line.id ? { ...row, cost: event.target.value } : row)))
                            }
                            onBlur={(event) => saveLine(line, { ...draft, cost: event.target.value })}
                            className="w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={draft.freight}
                            onChange={(event) =>
                              setLines((prev) => prev.map((row) => (row.id === line.id ? { ...row, freight: event.target.value } : row)))
                            }
                            onBlur={(event) => saveLine(line, { ...draft, freight: event.target.value })}
                            className="w-20 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-2 py-2">{line.importStatus ?? "-"}</td>
                        <td className="px-2 py-2">{new Date(line.updatedAt).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                  {importLines.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-2 py-8 text-center text-[var(--foreground)]/70">
                        No line items for selected import.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
