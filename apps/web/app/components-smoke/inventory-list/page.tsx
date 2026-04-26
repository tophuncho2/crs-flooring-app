"use client"

// Smoke page mirroring the inventory list view (`/dashboard/inventory`).
// Renders the migrated `apps/web/components/` primitives against fixture data
// shaped like `InventoryRow` from `@builders/domain`. No data fetching, no
// controllers, no API — pure visual rehearsal.
//
// Sibling smoke: /components-smoke (inventory record view + cut logs).
//
// DELETE BEFORE MERGING THE NEXT MIGRATION SWEEP:
//   rm -rf apps/web/app/components-smoke

import Link from "next/link"
import { useMemo, useState } from "react"
import { Grid, GridEmpty, type GridColumn, type GridLayout, type GridRow } from "@/components/grid"
import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { SortToggle } from "@/components/features/sort"
import { PaginateControls } from "@/components/features/paginate"

// ---------- Fixture types (shape matches `InventoryRow` from @builders/domain) ----------

type InventoryRowFixture = GridRow & {
  inventoryNumber: string
  importNumber: number
  productName: string
  itemNumber: string
  startingStock: string
  totalCutSum: string
  stockBalance: string
  coverageBalance: string | null
  stockUnitAbbrev: string
  itemCoverageUnitAbbrev: string
  sectionNumber: string | null
  locationShortCode: string | null
  warehouseName: string | null
  importWarehouseName: string | null
  locationCode: string | null
  dyeLot: string | null
  cost: string | null
  freight: string | null
  notes: string | null
  updatedAt: string
}

const INVENTORY: InventoryRowFixture[] = [
  {
    id: "inv-1",
    inventoryNumber: "INV-2046",
    importNumber: 7,
    productName: "Vinyl Plank — XL Cyrus Grayton",
    itemNumber: "123",
    startingStock: "55.00",
    totalCutSum: "0.00",
    stockBalance: "55.00",
    coverageBalance: "2646.05",
    stockUnitAbbrev: "bx",
    itemCoverageUnitAbbrev: "sqft",
    sectionNumber: "1",
    locationShortCode: "R1-L1",
    warehouseName: "Darby",
    importWarehouseName: "Darby",
    locationCode: "DRB-1-1",
    dyeLot: "2123",
    cost: "55",
    freight: "250",
    notes: "",
    updatedAt: "2026-04-21T12:00:00.000Z",
  },
  {
    id: "inv-2",
    inventoryNumber: "INV-2047",
    importNumber: 7,
    productName: "Vinyl Plank — Coastal Oak",
    itemNumber: "124",
    startingStock: "40.00",
    totalCutSum: "12.50",
    stockBalance: "27.50",
    coverageBalance: "1322.50",
    stockUnitAbbrev: "bx",
    itemCoverageUnitAbbrev: "sqft",
    sectionNumber: "1",
    locationShortCode: "R1-L2",
    warehouseName: "Darby",
    importWarehouseName: "Darby",
    locationCode: "DRB-1-2",
    dyeLot: "2123",
    cost: "58",
    freight: "250",
    notes: "Reserve for Mercer kitchen",
    updatedAt: "2026-04-22T08:30:00.000Z",
  },
  {
    id: "inv-3",
    inventoryNumber: "INV-2048",
    importNumber: 8,
    productName: "LVT Tile — Slate Grey",
    itemNumber: "215",
    startingStock: "80.00",
    totalCutSum: "80.00",
    stockBalance: "0.00",
    coverageBalance: null,
    stockUnitAbbrev: "ct",
    itemCoverageUnitAbbrev: "sqft",
    sectionNumber: "2",
    locationShortCode: "R2-L1",
    warehouseName: "Darby",
    importWarehouseName: "Darby",
    locationCode: "DRB-2-1",
    dyeLot: "",
    cost: "8",
    freight: "120",
    notes: "Fully consumed — pending archive",
    updatedAt: "2026-04-15T14:12:00.000Z",
  },
  {
    id: "inv-4",
    inventoryNumber: "INV-2049",
    importNumber: 9,
    productName: "Carpet — Berber Beige",
    itemNumber: "C-44",
    startingStock: "120.00",
    totalCutSum: "30.00",
    stockBalance: "90.00",
    coverageBalance: "1080.00",
    stockUnitAbbrev: "yd",
    itemCoverageUnitAbbrev: "sqft",
    sectionNumber: "1",
    locationShortCode: "R1-L4",
    warehouseName: "Holcomb",
    importWarehouseName: "Holcomb",
    locationCode: "HOL-1-4",
    dyeLot: "8821",
    cost: "11",
    freight: "300",
    notes: "",
    updatedAt: "2026-04-23T18:00:00.000Z",
  },
  {
    id: "inv-5",
    inventoryNumber: "INV-2050",
    importNumber: 9,
    productName: "Hardwood — White Oak Smoked",
    itemNumber: "WO-Sm",
    startingStock: "32.00",
    totalCutSum: "8.00",
    stockBalance: "24.00",
    coverageBalance: "576.00",
    stockUnitAbbrev: "bx",
    itemCoverageUnitAbbrev: "sqft",
    sectionNumber: "3",
    locationShortCode: "R3-L1",
    warehouseName: "Holcomb",
    importWarehouseName: "Holcomb",
    locationCode: "HOL-3-1",
    dyeLot: "WO-04-22",
    cost: "92",
    freight: "400",
    notes: "Premium grade",
    updatedAt: "2026-04-19T09:45:00.000Z",
  },
  {
    id: "inv-6",
    inventoryNumber: "INV-2051",
    importNumber: 10,
    productName: "Vinyl Plank — XL Cyrus Grayton",
    itemNumber: "123-B",
    startingStock: "55.00",
    totalCutSum: "0.00",
    stockBalance: "55.00",
    coverageBalance: "2646.05",
    stockUnitAbbrev: "bx",
    itemCoverageUnitAbbrev: "sqft",
    sectionNumber: "1",
    locationShortCode: "R1-L3",
    warehouseName: "Darby",
    importWarehouseName: "Darby",
    locationCode: "DRB-1-3",
    dyeLot: "2125",
    cost: "55",
    freight: "250",
    notes: "Re-order from same vendor",
    updatedAt: "2026-04-25T11:20:00.000Z",
  },
]

// ---------- Layout (mirrors live inventory-table.tsx) ----------------------

const INVENTORY_LIST_COLUMNS_BY_KEY: Record<string, GridColumn<InventoryRowFixture>> = {
  inventoryNumber: { key: "inventoryNumber", label: "Inv #", minWidth: 110, grow: 0 },
  importNumber: { key: "importNumber", label: "Import #", minWidth: 120, grow: 0 },
  product: { key: "product", label: "Product", minWidth: 200, grow: 1 },
  itemNumber: { key: "itemNumber", label: "Item #", minWidth: 120, grow: 0 },
  startingStock: { key: "startingStock", label: "Starting Balance", kind: "quantity", minWidth: 140, grow: 0, align: "end" },
  totalCutSum: { key: "totalCutSum", label: "Cut Balance", kind: "quantity", minWidth: 130, grow: 0, align: "end" },
  stockBalance: { key: "stockBalance", label: "Available", kind: "quantity", minWidth: 130, grow: 0, align: "end" },
  coverageBalance: { key: "coverageBalance", label: "Coverage", kind: "quantity", minWidth: 120, grow: 0, align: "end" },
  section: { key: "section", label: "Section", minWidth: 110, grow: 0 },
  location: { key: "location", label: "Location", minWidth: 130, grow: 0 },
  warehouse: { key: "warehouse", label: "Warehouse", minWidth: 160, grow: 1 },
  fullLocation: { key: "fullLocation", label: "Full Location", minWidth: 160, grow: 0 },
  dyeLot: { key: "dyeLot", label: "Dye Lot", minWidth: 120, grow: 0 },
  cost: { key: "cost", label: "Cost $", kind: "currency", minWidth: 110, grow: 0, align: "end" },
  freight: { key: "freight", label: "Freight $", kind: "currency", minWidth: 110, grow: 0, align: "end" },
  notes: { key: "notes", label: "Notes", minWidth: 200, grow: 1 },
  updated: { key: "updated", label: "Updated", minWidth: 120, grow: 0 },
}

// Default-visible column keys (mirrors live inventory list — 9 visible, 8 hidden).
const DEFAULT_VISIBLE_KEYS = [
  "inventoryNumber",
  "importNumber",
  "product",
  "itemNumber",
  "startingStock",
  "totalCutSum",
  "stockBalance",
  "section",
  "location",
  "warehouse",
  "dyeLot",
] as const

const HIDDEN_BY_DEFAULT_KEYS = [
  "coverageBalance",
  "fullLocation",
  "cost",
  "freight",
  "notes",
  "updated",
] as const

// ---------- Helpers --------------------------------------------------------

function formatStableDate(iso: string): string {
  return iso.split("T")[0] ?? iso
}

function formatInventoryQuantity(value: string, unit: string): string {
  if (!value) return "-"
  return `${value} ${unit}`
}

function formatImportNumber(n: number): string {
  return `IMP-${String(n).padStart(4, "0")}`
}

// ---------- Page -----------------------------------------------------------

export default function InventoryListSmokePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(
    new Set(HIDDEN_BY_DEFAULT_KEYS),
  )

  const filteredRows = useMemo(() => {
    if (!searchQuery) return INVENTORY
    const q = searchQuery.toLowerCase()
    return INVENTORY.filter((row) => {
      return (
        row.productName.toLowerCase().includes(q) ||
        row.itemNumber.toLowerCase().includes(q) ||
        formatImportNumber(row.importNumber).toLowerCase().includes(q) ||
        (row.sectionNumber ?? "").toLowerCase().includes(q) ||
        (row.locationShortCode ?? "").toLowerCase().includes(q) ||
        (row.warehouseName ?? "").toLowerCase().includes(q)
      )
    })
  }, [searchQuery])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) =>
      sortDirection === "asc"
        ? a.itemNumber.localeCompare(b.itemNumber)
        : b.itemNumber.localeCompare(a.itemNumber),
    )
  }, [filteredRows, sortDirection])

  const visibleColumns = useMemo(() => {
    return [...DEFAULT_VISIBLE_KEYS, ...HIDDEN_BY_DEFAULT_KEYS]
      .filter((key) => !hiddenColumnKeys.has(key))
      .map((key) => ({ key, label: INVENTORY_LIST_COLUMNS_BY_KEY[key].label }))
  }, [hiddenColumnKeys])

  const dataColumns = useMemo<GridColumn<InventoryRowFixture>[]>(() => {
    return visibleColumns
      .map((col) => INVENTORY_LIST_COLUMNS_BY_KEY[col.key])
      .filter((col): col is GridColumn<InventoryRowFixture> => Boolean(col))
  }, [visibleColumns])

  const layout: GridLayout<InventoryRowFixture> = { dataColumns }

  function toggleColumn(key: string) {
    setHiddenColumnKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-8">
      <SmokeNav />

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader title="Inventory" subtitle="Mirror of /dashboard/inventory — visual rehearsal only" />

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-3">
          <div className="min-w-[16rem] flex-1">
            <SearchControl
              query={searchQuery}
              onQueryChange={setSearchQuery}
              placeholder="Search product, item #, import, section, or location"
            />
          </div>
          <SortToggle
            sortKey="itemNumber"
            direction={sortDirection}
            onChange={({ direction }) => setSortDirection(direction)}
            ascendingLabel="A-Z"
            descendingLabel="Z-A"
          />
          <span className="text-xs text-[var(--foreground)]/55">
            {sortedRows.length} of {INVENTORY.length} inventory rows
          </span>
        </div>

        {/* Column visibility toggles — smoke-only affordance to demonstrate the
            visibleColumns → dataColumns dynamic mapping. The live list drives
            this from server-saved table preferences. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-2">
          <span className="text-xs uppercase text-[var(--foreground)]/55">Columns</span>
          {[...DEFAULT_VISIBLE_KEYS, ...HIDDEN_BY_DEFAULT_KEYS].map((key) => {
            const active = !hiddenColumnKeys.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleColumn(key)}
                className={[
                  "rounded-full border px-2 py-0.5 text-xs transition",
                  active
                    ? "border-sky-500/45 bg-sky-500/10 text-sky-700"
                    : "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)]/55",
                ].join(" ")}
              >
                {INVENTORY_LIST_COLUMNS_BY_KEY[key].label}
              </button>
            )
          })}
        </div>

        <Grid<InventoryRowFixture>
          rows={sortedRows}
          layout={layout}
          empty={<GridEmpty>No live inventory rows yet.</GridEmpty>}
          onRowClick={(row) => alert(`Open inventory ${row.inventoryNumber}`)}
          getRowAriaLabel={(row) => `Open inventory item ${row.itemNumber}`}
          renderCell={(column, row) => {
            switch (column.key) {
              case "inventoryNumber":
                return <span className="font-medium">{row.inventoryNumber}</span>
              case "importNumber":
                return (
                  <span className="font-medium text-blue-500">
                    {formatImportNumber(row.importNumber)}
                  </span>
                )
              case "product":
                return row.productName || "-"
              case "itemNumber":
                return row.itemNumber || "-"
              case "startingStock":
                return (
                  <span className="tabular-nums">
                    {formatInventoryQuantity(row.startingStock, row.stockUnitAbbrev)}
                  </span>
                )
              case "totalCutSum":
                return (
                  <span className="tabular-nums">
                    {formatInventoryQuantity(row.totalCutSum, row.stockUnitAbbrev)}
                  </span>
                )
              case "stockBalance":
                return (
                  <span className="font-semibold tabular-nums">
                    {formatInventoryQuantity(row.stockBalance, row.stockUnitAbbrev)}
                  </span>
                )
              case "coverageBalance":
                return (
                  <span className="tabular-nums">
                    {row.coverageBalance
                      ? formatInventoryQuantity(row.coverageBalance, row.itemCoverageUnitAbbrev)
                      : "-"}
                  </span>
                )
              case "section":
                return row.sectionNumber || "-"
              case "location":
                return row.locationShortCode || "-"
              case "warehouse":
                return row.importWarehouseName || row.warehouseName || "-"
              case "fullLocation":
                return row.locationCode || "-"
              case "dyeLot":
                return row.dyeLot || "-"
              case "cost":
                return <span className="tabular-nums">{row.cost || "-"}</span>
              case "freight":
                return <span className="tabular-nums">{row.freight || "-"}</span>
              case "notes":
                return row.notes || "-"
              case "updated":
                return formatStableDate(row.updatedAt)
              default:
                return "-"
            }
          }}
          footerSlot={
            <PaginateControls
              page={page}
              pageSize={25}
              totalItems={sortedRows.length}
              totalPages={Math.max(1, Math.ceil(sortedRows.length / 25))}
              hasPreviousPage={page > 1}
              hasNextPage={page < Math.max(1, Math.ceil(sortedRows.length / 25))}
              onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
              onNextPage={() =>
                setPage((p) => Math.min(Math.max(1, Math.ceil(sortedRows.length / 25)), p + 1))
              }
            />
          }
        />
      </div>
    </div>
  )
}

// ---------- Local nav (smoke pages only) -----------------------------------

function SmokeNav() {
  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      <Link href="/components-smoke" className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]">
        ← Inventory record
      </Link>
      <span className="text-[var(--foreground)]/45">·</span>
      <span className="font-medium text-[var(--foreground)]">Inventory list</span>
      <span className="text-[var(--foreground)]/45">·</span>
      <Link href="/components-smoke/templates-list" className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]">
        Templates list
      </Link>
      <span className="text-[var(--foreground)]/45">·</span>
      <Link href="/components-smoke/templates-record" className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]">
        Templates record →
      </Link>
    </nav>
  )
}
