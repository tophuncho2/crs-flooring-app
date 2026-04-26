"use client"

// Smoke page mirroring the templates list view (`/dashboard/templates`).
// Renders the new `apps/web/components/` primitives against fixture data
// shaped like `TemplateListRow` from `@builders/domain`. No data fetching,
// no controllers, no API — pure visual rehearsal.
//
// Sibling smokes:
//   - /components-smoke                — inventory record + cut logs
//   - /components-smoke/inventory-list — inventory list
//   - /components-smoke/templates-record — templates record (primary + material items)
//
// DELETE BEFORE MERGING THE NEXT MIGRATION SWEEP:
//   rm -rf apps/web/app/components-smoke

import Link from "next/link"
import { useMemo, useState } from "react"
import { Grid, GridEmpty, type GridColumn, type GridLayout, type GridRow } from "@/components/grid"
import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { SortToggle } from "@/components/features/sort"
import { GroupTree, type GroupNode } from "@/components/features/group"
import { PaginateControls } from "@/components/features/paginate"

// ---------- Fixture types (shape matches `TemplateListRow` from @builders/domain) ----------

type TemplateRowFixture = GridRow & {
  templateNumber: string
  unitType: string
  propertyName: string
  managementCompanyName: string | null
  jobTypeName: string | null
  warehouseName: string
  description: string
  itemsCount: number
}

const TEMPLATES: TemplateRowFixture[] = [
  {
    id: "tpl-1",
    templateNumber: "TPL-0001",
    unitType: "1BR/1BA",
    propertyName: "Mercer Apartments",
    managementCompanyName: "Bluepoint Management",
    jobTypeName: "Make-Ready",
    warehouseName: "Darby",
    description: "Standard 1BR turn — vinyl plank throughout",
    itemsCount: 6,
  },
  {
    id: "tpl-2",
    templateNumber: "TPL-0002",
    unitType: "2BR/2BA",
    propertyName: "Mercer Apartments",
    managementCompanyName: "Bluepoint Management",
    jobTypeName: "Make-Ready",
    warehouseName: "Darby",
    description: "Standard 2BR turn — vinyl plank + carpet bedrooms",
    itemsCount: 9,
  },
  {
    id: "tpl-3",
    templateNumber: "TPL-0003",
    unitType: "Studio",
    propertyName: "Holcomb Lofts",
    managementCompanyName: "Holcomb Properties",
    jobTypeName: "Make-Ready",
    warehouseName: "Holcomb",
    description: "Studio loft — full LVT install",
    itemsCount: 4,
  },
  {
    id: "tpl-4",
    templateNumber: "TPL-0004",
    unitType: "Townhouse",
    propertyName: "Patel Row",
    managementCompanyName: null,
    jobTypeName: "Renovation",
    warehouseName: "Holcomb",
    description: "Three-level townhouse — hardwood downstairs, carpet up",
    itemsCount: 14,
  },
  {
    id: "tpl-5",
    templateNumber: "TPL-0005",
    unitType: "Office",
    propertyName: "Brookhurst Plaza",
    managementCompanyName: "Brookhurst Commercial",
    jobTypeName: "Tenant Improvement",
    warehouseName: "Darby",
    description: "Open-plan office — bay + closet + reception",
    itemsCount: 11,
  },
  {
    id: "tpl-6",
    templateNumber: "TPL-0006",
    unitType: "1BR/1BA",
    propertyName: "Mercer Apartments",
    managementCompanyName: "Bluepoint Management",
    jobTypeName: "Premium Turn",
    warehouseName: "Darby",
    description: "Premium 1BR — engineered hardwood + tile bath",
    itemsCount: 8,
  },
  {
    id: "tpl-7",
    templateNumber: "TPL-0007",
    unitType: "Common Area",
    propertyName: "Holcomb Lofts",
    managementCompanyName: "Holcomb Properties",
    jobTypeName: null,
    warehouseName: "Holcomb",
    description: "Lobby + corridor refresh",
    itemsCount: 3,
  },
]

// ---------- Layout (mirrors live templates-table.tsx) ----------------------

const TEMPLATES_LIST_COLUMNS_BY_KEY: Record<string, GridColumn<TemplateRowFixture>> = {
  templateNumber: { key: "templateNumber", label: "Template #", minWidth: 130, grow: 0 },
  unitType: { key: "unitType", label: "Unit Type", minWidth: 130, grow: 0 },
  property: { key: "property", label: "Property", minWidth: 200, grow: 1 },
  managementCompany: { key: "managementCompany", label: "Management Company", minWidth: 200, grow: 1 },
  jobType: { key: "jobType", label: "Job Type", minWidth: 160, grow: 0 },
  warehouse: { key: "warehouse", label: "Warehouse", minWidth: 140, grow: 0 },
  description: { key: "description", label: "Description", minWidth: 280, grow: 1.5 },
  items: { key: "items", label: "Items", kind: "number", minWidth: 80, grow: 0, align: "end" },
}

// All 8 columns visible by default (matches live templates list — no hidden columns).
const ALL_COLUMN_KEYS = [
  "templateNumber",
  "unitType",
  "property",
  "managementCompany",
  "jobType",
  "warehouse",
  "description",
  "items",
] as const

// Columns the user can group by. Mirrors the live templates list's `groupable`
// flags on `useConfiguredTableState` fields.
const GROUPABLE_KEYS = ["property", "managementCompany", "jobType", "warehouse", "unitType"] as const

type GroupableKey = (typeof GROUPABLE_KEYS)[number]

const GROUPABLE_LABELS: Record<GroupableKey, string> = {
  property: "Property",
  managementCompany: "Management Company",
  jobType: "Job Type",
  warehouse: "Warehouse",
  unitType: "Unit Type",
}

function groupValue(row: TemplateRowFixture, key: GroupableKey): string {
  switch (key) {
    case "property":
      return row.propertyName || "—"
    case "managementCompany":
      return row.managementCompanyName || "(no management company)"
    case "jobType":
      return row.jobTypeName || "(no job type)"
    case "warehouse":
      return row.warehouseName || "—"
    case "unitType":
      return row.unitType || "—"
  }
}

// ---------- Page -----------------------------------------------------------

export default function TemplatesListSmokePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [groupKey, setGroupKey] = useState<GroupableKey | "">("")

  const filteredRows = useMemo(() => {
    if (!searchQuery) return TEMPLATES
    const q = searchQuery.toLowerCase()
    return TEMPLATES.filter((row) => {
      return (
        row.templateNumber.toLowerCase().includes(q) ||
        row.unitType.toLowerCase().includes(q) ||
        row.propertyName.toLowerCase().includes(q) ||
        (row.managementCompanyName ?? "").toLowerCase().includes(q) ||
        (row.jobTypeName ?? "").toLowerCase().includes(q) ||
        row.warehouseName.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q)
      )
    })
  }, [searchQuery])

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) =>
      sortDirection === "asc"
        ? a.templateNumber.localeCompare(b.templateNumber)
        : b.templateNumber.localeCompare(a.templateNumber),
    )
  }, [filteredRows, sortDirection])

  const dataColumns: GridColumn<TemplateRowFixture>[] = ALL_COLUMN_KEYS
    .map((key) => TEMPLATES_LIST_COLUMNS_BY_KEY[key])
    .filter((col): col is GridColumn<TemplateRowFixture> => Boolean(col))

  const layout: GridLayout<TemplateRowFixture> = { dataColumns }

  // Build the group tree when a group key is selected. Empty buckets are
  // dropped; bucket label includes the row count for quick visual scan.
  const groupTree = useMemo<GroupNode<TemplateRowFixture>[]>(() => {
    if (!groupKey) return []
    const buckets = new Map<string, TemplateRowFixture[]>()
    for (const row of sortedRows) {
      const value = groupValue(row, groupKey)
      const list = buckets.get(value)
      if (list) list.push(row)
      else buckets.set(value, [row])
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, rows]) => ({
        key: `${groupKey}:${label}`,
        label: `${label} (${rows.length})`,
        rows,
      }))
  }, [sortedRows, groupKey])

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-8">
      <SmokeNav />

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Templates"
          subtitle="Mirror of /dashboard/templates — visual rehearsal only"
          actions={[
            { key: "new", label: "+ Template", onClick: () => alert("Open create"), kind: "primary" },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-3">
          <div className="min-w-[16rem] flex-1">
            <SearchControl
              query={searchQuery}
              onQueryChange={setSearchQuery}
              placeholder="Search templates..."
            />
          </div>
          <SortToggle
            sortKey="templateNumber"
            direction={sortDirection}
            onChange={({ direction }) => setSortDirection(direction)}
            ascendingLabel="A-Z"
            descendingLabel="Z-A"
          />
          <span className="text-xs text-[var(--foreground)]/55">
            {sortedRows.length} of {TEMPLATES.length} templates
          </span>
        </div>

        {/* Column visibility toggles — smoke-only affordance demonstrating the
            visibleColumns → dataColumns dynamic mapping. The live list drives
            this from server-saved table preferences. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-2">
          <span className="text-xs uppercase text-[var(--foreground)]/55">Columns</span>
          {ALL_COLUMN_KEYS.map((key) => {
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
                {TEMPLATES_LIST_COLUMNS_BY_KEY[key].label}
              </button>
            )
          })}
        </div>

        <Grid<TemplateRowFixture>
          rows={sortedRows}
          layout={layout}
          empty={<GridEmpty>No templates found.</GridEmpty>}
          onRowClick={(row) => alert(`Open template ${row.templateNumber}`)}
          getRowAriaLabel={(row) => `Open template ${row.templateNumber}`}
          renderCell={(column, row) => {
            switch (column.key) {
              case "templateNumber":
                return <span className="font-medium text-blue-500">{row.templateNumber}</span>
              case "unitType":
                return row.unitType || "-"
              case "property":
                return row.propertyName || "-"
              case "managementCompany":
                return row.managementCompanyName || "-"
              case "jobType":
                return row.jobTypeName || "-"
              case "warehouse":
                return row.warehouseName || "-"
              case "description":
                return row.description || "-"
              case "items":
                return <span className="tabular-nums">{row.itemsCount}</span>
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
        Inventory record
      </Link>
      <span className="text-[var(--foreground)]/45">·</span>
      <Link href="/components-smoke/inventory-list" className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]">
        Inventory list
      </Link>
      <span className="text-[var(--foreground)]/45">·</span>
      <span className="font-medium text-[var(--foreground)]">Templates list</span>
      <span className="text-[var(--foreground)]/45">·</span>
      <Link href="/components-smoke/templates-record" className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]">
        Templates record →
      </Link>
    </nav>
  )
}
