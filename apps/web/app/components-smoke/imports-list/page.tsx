"use client"

// Smoke page mirroring the imports list view (`/dashboard/imports`).
// Renders the new components/ tree against fixture data shaped like
// `ImportRow` from `@builders/domain`. No data fetching; no controllers
// imported. Pure visual rehearsal for the next sweep's migration.
//
// DELETE BEFORE MERGING THE NEXT MIGRATION SWEEP:
//   rm -rf apps/web/app/components-smoke

import Link from "next/link"
import { useState } from "react"
import { Grid, type GridLayout, type GridRow } from "@/components/grid"
import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { SortToggle } from "@/components/features/sort"
import { PaginateControls } from "@/components/features/paginate"

// ---------- Fixture data (shape matches `ImportRow` post-sweep-4e) ---------

type ImportRowFixture = GridRow & {
  importNumber: number
  orderNumber: string
  tag: string
  percent: string
  warehouseName: string
  manufacturerName: string
  stagedInventoryRowsCount: number
  liveInventoryRowsCount: number
  createdAt: string
}

const IMPORTS: ImportRowFixture[] = [
  {
    id: "imp-1",
    importNumber: 1,
    orderNumber: "PO-12345",
    tag: "Spring 24",
    percent: "100",
    warehouseName: "Warehouse 1",
    manufacturerName: "Acme Flooring",
    stagedInventoryRowsCount: 12,
    liveInventoryRowsCount: 12,
    createdAt: "2026-04-01",
  },
  {
    id: "imp-2",
    importNumber: 2,
    orderNumber: "PO-12346",
    tag: "Replenishment",
    percent: "37",
    warehouseName: "Warehouse 2",
    manufacturerName: "Mohawk",
    stagedInventoryRowsCount: 8,
    liveInventoryRowsCount: 3,
    createdAt: "2026-04-08",
  },
  {
    id: "imp-3",
    importNumber: 3,
    orderNumber: "",
    tag: "",
    percent: "0",
    warehouseName: "Warehouse 1",
    manufacturerName: "Shaw",
    stagedInventoryRowsCount: 4,
    liveInventoryRowsCount: 0,
    createdAt: "2026-04-15",
  },
  {
    id: "imp-4",
    importNumber: 4,
    orderNumber: "PO-12350",
    tag: "Hotel restock",
    percent: "100",
    warehouseName: "Warehouse 1",
    manufacturerName: "Tarkett",
    stagedInventoryRowsCount: 24,
    liveInventoryRowsCount: 24,
    createdAt: "2026-04-18",
  },
  {
    id: "imp-5",
    importNumber: 5,
    orderNumber: "PO-12351",
    tag: "",
    percent: "12",
    warehouseName: "Warehouse 3",
    manufacturerName: "Acme Flooring",
    stagedInventoryRowsCount: 6,
    liveInventoryRowsCount: 1,
    createdAt: "2026-04-22",
  },
]

// ---------- Layout ---------------------------------------------------------

const IMPORTS_LIST_LAYOUT: GridLayout<ImportRowFixture> = {
  dataColumns: [
    { key: "importNumber", label: "Import #", minWidth: 120, grow: 0 },
    { key: "tag", label: "Tag", minWidth: 140, grow: 1 },
    { key: "warehouseName", label: "Warehouse", minWidth: 160, grow: 1, groupable: true },
    { key: "manufacturerName", label: "Manufacturer", minWidth: 160, grow: 1, groupable: true },
    { key: "percent", label: "Percent", kind: "number", minWidth: 100, grow: 0, align: "end" },
    { key: "stagedInventoryRowsCount", label: "Staged", kind: "number", minWidth: 90, grow: 0, align: "end" },
    { key: "liveInventoryRowsCount", label: "Live", kind: "number", minWidth: 80, grow: 0, align: "end" },
    { key: "createdAt", label: "Created", minWidth: 120, grow: 0 },
  ],
}

// ---------- Page -----------------------------------------------------------

export default function ImportsListSmokePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  // Filter + sort the fixture rows so the controls feel live.
  const filteredRows = IMPORTS.filter((row) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      row.orderNumber.toLowerCase().includes(q) ||
      row.tag.toLowerCase().includes(q) ||
      row.warehouseName.toLowerCase().includes(q) ||
      row.manufacturerName.toLowerCase().includes(q)
    )
  })
  const sortedRows = [...filteredRows].sort((a, b) =>
    sortDirection === "asc" ? a.importNumber - b.importNumber : b.importNumber - a.importNumber,
  )

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-8">
      <SmokeNav />
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Imports"
          subtitle="Mirror of `/dashboard/imports` — visual rehearsal only"
          actions={[
            { key: "new", label: "+ Import", onClick: () => alert("Open create"), kind: "primary" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-3">
          <div className="min-w-[16rem] flex-1">
            <SearchControl
              query={searchQuery}
              onQueryChange={setSearchQuery}
              placeholder="Search import # or tag"
            />
          </div>
          <SortToggle
            sortKey="importNumber"
            direction={sortDirection}
            onChange={({ direction }) => setSortDirection(direction)}
            ascendingLabel="1-9"
            descendingLabel="9-1"
          />
          <span className="text-xs text-[var(--foreground)]/55">
            {sortedRows.length} of {IMPORTS.length} imports
          </span>
        </div>

        <Grid<ImportRowFixture>
          rows={sortedRows}
          layout={IMPORTS_LIST_LAYOUT}
          renderCell={(column, row) => {
            switch (column.key) {
              case "importNumber":
                return (
                  <span className="font-medium text-blue-500">
                    IMP-{String(row.importNumber).padStart(4, "0")}
                  </span>
                )
              case "tag":
                return row.tag || "-"
              case "percent":
                return <span className="tabular-nums">{row.percent ? `${row.percent}%` : "-"}</span>
              case "stagedInventoryRowsCount":
                return <span className="tabular-nums">{row.stagedInventoryRowsCount}</span>
              case "liveInventoryRowsCount":
                return <span className="tabular-nums">{row.liveInventoryRowsCount}</span>
              case "createdAt":
                return row.createdAt
              default: {
                const value = (row as Record<string, unknown>)[column.key]
                return value === null || value === undefined || value === "" ? "-" : String(value)
              }
            }
          }}
          footerSlot={
            <PaginateControls
              page={page}
              pageSize={25}
              totalItems={140}
              totalPages={6}
              hasPreviousPage={page > 1}
              hasNextPage={page < 6}
              onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setPage((p) => Math.min(6, p + 1))}
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
    <nav className="flex gap-3 text-sm">
      <Link href="/components-smoke" className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]">
        ← Primitive catalog
      </Link>
      <span className="text-[var(--foreground)]/45">/</span>
      <span className="text-[var(--foreground)] font-medium">Imports list</span>
      <span className="text-[var(--foreground)]/45">·</span>
      <Link href="/components-smoke/imports-record" className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]">
        Imports record →
      </Link>
    </nav>
  )
}
