"use client"

import { type ReactNode, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

export type InventoryRow = {
  id: string
  productId: string
  categoryName: string | null
  manufacturer: string | null
  warehouseId: string | null
  warehouseName: string | null
  section: string | null
  locationId: string | null
  locationCode: string | null
  itemNumber: string | null
  dyeLot: string | null
  stockCount: string
  stockUnit: string | null
  cost: string | null
  freight: string | null
  importBatchId: string | null
  importStatus: string | null
  cutLogsCount: number
  createdAt: string
  updatedAt: string
}

type GroupByKey = "product" | "category" | "manufacturer" | "warehouse" | "section" | "location" | "lowStock"

type GroupByState = {
  group1: GroupByKey | ""
  group2: GroupByKey | ""
  group3: GroupByKey | ""
}

const LOW_STOCK_THRESHOLD = 5

function hasLowStock(stockCount: string) {
  return Number(stockCount) <= LOW_STOCK_THRESHOLD
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

function valueForGroupKey(row: InventoryRow, key: GroupByKey): string {
  if (key === "product") return row.productId
  if (key === "category") return row.categoryName ?? "Uncategorized"
  if (key === "manufacturer") return row.manufacturer ?? "Unassigned"
  if (key === "warehouse") return row.warehouseName ?? "No Warehouse"
  if (key === "section") return row.section ?? "No Section"
  if (key === "location") return row.locationCode ?? "No Location"
  return hasLowStock(row.stockCount) ? "Low" : "OK"
}

function isValidStockInput(value: string): boolean {
  const normalized = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return false
  return (normalized.split(".")[1]?.length ?? 0) <= 4
}

function formatStock(value: string): string {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return value
  return parsed.toFixed(4)
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
      <div className="w-full max-w-3xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 shadow-xl">
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

type InventoryDraft = {
  itemNumber: string
  dyeLot: string
  stockCount: string
  cost: string
  freight: string
}

function isValidMoneyInput(value: string): boolean {
  const normalized = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return false
  return (normalized.split(".")[1]?.length ?? 0) <= 2
}

function formatMoney(value: string): string {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return value
  return parsed.toFixed(2)
}

export default function InventoryClient({ initialRows }: { initialRows: InventoryRow[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [drafts, setDrafts] = useState<Record<string, InventoryDraft>>({})
  const [groupBy, setGroupBy] = useState<GroupByState>({ group1: "", group2: "", group3: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [activeRow, setActiveRow] = useState<InventoryRow | null>(null)

  const selectedGroups = useMemo(
    () => [groupBy.group1, groupBy.group2, groupBy.group3].filter((value): value is GroupByKey => Boolean(value)),
    [groupBy],
  )

  const groupedRows = useMemo(() => {
    if (selectedGroups.length === 0) return []

    const groupMap = new Map<
      string,
      {
        key: string
        values: Record<GroupByKey, string>
        stockCount: number
        rowCount: number
      }
    >()

    for (const row of rows) {
      const parts = selectedGroups.map((group) => valueForGroupKey(row, group))
      const mapKey = parts.join("||")
      const existing = groupMap.get(mapKey)

      if (existing) {
        existing.stockCount += Number(row.stockCount)
        existing.rowCount += 1
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

      for (const group of selectedGroups) {
        values[group] = valueForGroupKey(row, group)
      }

      groupMap.set(mapKey, {
        key: mapKey,
        values,
        stockCount: Number(row.stockCount),
        rowCount: 1,
      })
    }

    return Array.from(groupMap.values())
  }, [rows, selectedGroups])

  function getDraft(row: InventoryRow): InventoryDraft {
    return (
      drafts[row.id] ?? {
        itemNumber: row.itemNumber ?? "",
        dyeLot: row.dyeLot ?? "",
        stockCount: row.stockCount,
        cost: row.cost ?? "0.00",
        freight: row.freight ?? "0.00",
      }
    )
  }

  function setDraft(rowId: string, patch: Partial<InventoryDraft>) {
    const found = rows.find((row) => row.id === rowId)
    if (!found) return
    setDrafts((prev) => ({ ...prev, [rowId]: { ...getDraft(found), ...patch } }))
  }

  async function saveRow(row: InventoryRow) {
    const draft = getDraft(row)
    if (!isValidStockInput(draft.stockCount.trim())) {
      setError("Stock count must be numeric with up to 4 decimals")
      return
    }
    if (!isValidMoneyInput(draft.cost.trim()) || !isValidMoneyInput(draft.freight.trim())) {
      setError("Cost and freight must be numeric with up to 2 decimals")
      return
    }

    setError("")
    setMessage("")

    try {
      const response = await fetch(`/api/flooring/inventory/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemNumber: draft.itemNumber,
          dyeLot: draft.dyeLot,
          stockCount: formatStock(draft.stockCount),
          cost: formatMoney(draft.cost),
          freight: formatMoney(draft.freight),
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
        throw new Error(payload.error ?? "Failed to update inventory")
      }

      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                itemNumber: payload.lot?.itemNumber ?? draft.itemNumber,
                dyeLot: payload.lot?.dyeLot ?? draft.dyeLot,
                stockCount: payload.lot?.stockCount ?? formatStock(draft.stockCount),
                cost: payload.lot?.cost ?? formatMoney(draft.cost),
                freight: payload.lot?.freight ?? formatMoney(draft.freight),
                importStatus: payload.lot?.importStatus ?? item.importStatus,
              }
            : item,
        ),
      )
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setMessage("Inventory row updated")
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update inventory")
    }
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Inventory</h1>
            <p className="text-sm text-[var(--foreground)]/70">
              Inventory rows are tracked by product and can be grouped by up to 3 dimensions.
            </p>
          </div>

        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span>Group 1</span>
            <select
              value={groupBy.group1}
              onChange={(event) => updateGroup("group1", event.target.value)}
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
            >
              <option value="">None</option>
              <option value="product">Product</option>
              <option value="category">Category</option>
              <option value="manufacturer">Manufacturer</option>
              <option value="warehouse">Warehouse</option>
              <option value="section">Section</option>
              <option value="location">Location</option>
              <option value="lowStock">Low Stock Identifier</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span>Group 2</span>
            <select
              value={groupBy.group2}
              onChange={(event) => updateGroup("group2", event.target.value)}
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
            >
              <option value="">None</option>
              <option value="product">Product</option>
              <option value="category">Category</option>
              <option value="manufacturer">Manufacturer</option>
              <option value="warehouse">Warehouse</option>
              <option value="section">Section</option>
              <option value="location">Location</option>
              <option value="lowStock">Low Stock Identifier</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span>Group 3</span>
            <select
              value={groupBy.group3}
              onChange={(event) => updateGroup("group3", event.target.value)}
              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
            >
              <option value="">None</option>
              <option value="product">Product</option>
              <option value="category">Category</option>
              <option value="manufacturer">Manufacturer</option>
              <option value="warehouse">Warehouse</option>
              <option value="section">Section</option>
              <option value="location">Location</option>
              <option value="lowStock">Low Stock Identifier</option>
            </select>
          </label>

          <button
            onClick={() => router.push("/dashboard/products")}
            type="button"
            className="rounded-lg border border-[var(--panel-border)] px-4 py-2 text-sm transition hover:bg-[var(--panel-hover)]"
          >
            Go To Products
          </button>
        </div>

        {message && (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
          <div className="overflow-x-auto">
            {selectedGroups.length > 0 ? (
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--panel-hover)] text-left">
                  <tr>
                    {selectedGroups.map((group) => (
                      <th key={group} className="px-3 py-2">
                        {labelForGroupKey(group)}
                      </th>
                    ))}
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map((row) => (
                    <tr key={row.key} className="border-t border-[var(--panel-border)]">
                      {selectedGroups.map((group) => (
                        <td key={`${row.key}-${group}`} className="px-3 py-2">
                          {row.values[group]}
                        </td>
                      ))}
                      <td className="px-3 py-2">{row.stockCount.toFixed(4)}</td>
                      <td className="px-3 py-2">{row.rowCount}</td>
                    </tr>
                  ))}
                  {groupedRows.length === 0 && (
                    <tr>
                      <td colSpan={selectedGroups.length + 2} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                        No grouped results.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--panel-hover)] text-left">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Manufacturer</th>
                    <th className="px-3 py-2">Item #</th>
                    <th className="px-3 py-2">Dye Lot</th>
                    <th className="px-3 py-2">Warehouse</th>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Import Status</th>
                    <th className="px-3 py-2">Cut Logs</th>
                    <th className="px-3 py-2">Low Stock</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Cost</th>
                    <th className="px-3 py-2">Freight</th>
                    <th className="px-3 py-2">Last Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const draft = getDraft(row)
                    return (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]"
                        onClick={() => setActiveRow(row)}
                      >
                        <td className="px-3 py-2">{row.productId}</td>
                        <td className="px-3 py-2">{row.categoryName ?? "Uncategorized"}</td>
                        <td className="px-3 py-2">{row.manufacturer ?? "Unassigned"}</td>
                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <input
                            value={draft.itemNumber}
                            onChange={(event) => setDraft(row.id, { itemNumber: event.target.value })}
                            onBlur={() => saveRow(row)}
                            className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <input
                            value={draft.dyeLot}
                            onChange={(event) => setDraft(row.id, { dyeLot: event.target.value })}
                            onBlur={() => saveRow(row)}
                            className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">{row.warehouseName ?? "No Warehouse"}</td>
                        <td className="px-3 py-2">{row.section ?? "No Section"}</td>
                        <td className="px-3 py-2">{row.locationCode ?? "No Location"}</td>
                        <td className="px-3 py-2">{row.importStatus ?? "-"}</td>
                        <td className="px-3 py-2">{row.cutLogsCount}</td>
                        <td className="px-3 py-2">{hasLowStock(row.stockCount) ? "Low" : "OK"}</td>
                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <input
                            value={draft.stockCount}
                            onChange={(event) => setDraft(row.id, { stockCount: event.target.value })}
                            onBlur={() => saveRow(row)}
                            className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <input
                            value={draft.cost}
                            onChange={(event) => setDraft(row.id, { cost: event.target.value })}
                            onBlur={() => saveRow(row)}
                            className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <input
                            value={draft.freight}
                            onChange={(event) => setDraft(row.id, { freight: event.target.value })}
                            onBlur={() => saveRow(row)}
                            className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">{new Date(row.updatedAt).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                        No inventory rows yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {activeRow && (
        <ModalShell title={`Inventory Row - ${activeRow.productId}`} onClose={() => setActiveRow(null)}>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md border border-[var(--panel-border)] px-3 py-2">
              <span className="text-[var(--foreground)]/70">Product</span>
              <div className="font-medium">{activeRow.productId}</div>
            </div>
            <div className="rounded-md border border-[var(--panel-border)] px-3 py-2">
              <span className="text-[var(--foreground)]/70">Category</span>
              <div className="font-medium">{activeRow.categoryName ?? "Uncategorized"}</div>
            </div>
            <div className="rounded-md border border-[var(--panel-border)] px-3 py-2">
              <span className="text-[var(--foreground)]/70">Manufacturer</span>
              <div className="font-medium">{activeRow.manufacturer ?? "Unassigned"}</div>
            </div>
            <div className="rounded-md border border-[var(--panel-border)] px-3 py-2">
              <span className="text-[var(--foreground)]/70">Warehouse</span>
              <div className="font-medium">{activeRow.warehouseName ?? "No Warehouse"}</div>
            </div>
            <div className="rounded-md border border-[var(--panel-border)] px-3 py-2">
              <span className="text-[var(--foreground)]/70">Section / Location</span>
              <div className="font-medium">{activeRow.section ?? "No Section"} / {activeRow.locationCode ?? "No Location"}</div>
            </div>
            <div className="rounded-md border border-[var(--panel-border)] px-3 py-2">
              <span className="text-[var(--foreground)]/70">Stock</span>
              <div className="font-medium">{activeRow.stockCount} {activeRow.stockUnit ?? ""}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => router.push("/dashboard/products")}
              type="button"
              className="rounded-lg border border-[var(--panel-border)] px-4 py-2 transition hover:bg-[var(--panel-hover)]"
            >
              Open Products
            </button>
            <button
              onClick={() => setActiveRow(null)}
              type="button"
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400"
            >
              Close
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
