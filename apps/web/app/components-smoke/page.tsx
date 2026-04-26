"use client"

// Throwaway smoke page for the apps/web/components/ tree. Renders every
// primitive against fixture data so we can eyeball CSS Grid templates,
// dropdown popovers, cell tone classes, and FieldSection layout before
// migrating any module onto the new components.
//
// DELETE THIS FILE BEFORE MERGING THE NEXT MIGRATION SWEEP:
//   rm -rf apps/web/app/components-smoke

import { Fragment, useState } from "react"

// grid/
import {
  Grid,
  GridBodyRow,
  ScopedRow,
  type GridColumn,
  type GridLayout,
  type GridRow,
} from "@/components/grid"

// layout-grid/ + fields/
import { LayoutGrid, CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"

// cells/
import {
  TextCell,
  NumberCell,
  CurrencyCell,
  UnitCell,
  PerUnitCell,
  SelectCell,
  DropdownCell,
  StatusCell,
  CheckboxCell,
} from "@/components/cells"

// dropdowns/
import { SelectDropdown, SearchDropdown } from "@/components/dropdowns"

// badges/
import { StatusBadge, TonePill } from "@/components/badges"

// headers/
import { SectionHeader, ActionHeader } from "@/components/headers"

// features/
import { SearchControl } from "@/components/features/search"
import { SortToggle } from "@/components/features/sort"
import { GroupTree } from "@/components/features/group"
import { PaginateControls } from "@/components/features/paginate"

// ---------- Fixture data ---------------------------------------------------

type ImportFixture = GridRow & {
  id: string
  importNumber: string
  tag: string
  warehouseName: string
  manufacturerName: string
  percent: string
  stagedCount: number
  liveCount: number
  status: "DRAFT" | "QUEUED" | "IMPORTED"
}

const IMPORT_FIXTURES: ImportFixture[] = [
  {
    id: "imp-1",
    importNumber: "IMP-0001",
    tag: "Spring 24",
    warehouseName: "Warehouse 1",
    manufacturerName: "Acme Flooring",
    percent: "100",
    stagedCount: 12,
    liveCount: 12,
    status: "IMPORTED",
  },
  {
    id: "imp-2",
    importNumber: "IMP-0002",
    tag: "Replenishment",
    warehouseName: "Warehouse 2",
    manufacturerName: "Mohawk",
    percent: "37",
    stagedCount: 8,
    liveCount: 3,
    status: "QUEUED",
    tone: "warning",
  },
  {
    id: "imp-3",
    importNumber: "IMP-0003",
    tag: "",
    warehouseName: "Warehouse 1",
    manufacturerName: "Shaw",
    percent: "0",
    stagedCount: 4,
    liveCount: 0,
    status: "DRAFT",
  },
]

type SectionFixture = GridRow & { id: string; number: string; locationsCount: number }
type LocationFixture = GridRow & { id: string; rafter: string; level: string; label: string }

const SECTION_FIXTURES: SectionFixture[] = [
  { id: "sec-1", number: "Section 1", locationsCount: 2 },
  { id: "sec-2", number: "Section 2", locationsCount: 1 },
]

const LOCATIONS_BY_SECTION: Record<string, LocationFixture[]> = {
  "sec-1": [
    { id: "loc-1", rafter: "1", level: "1", label: "R1-L1" },
    { id: "loc-2", rafter: "1", level: "2", label: "R1-L2" },
  ],
  "sec-2": [{ id: "loc-3", rafter: "2", level: "1", label: "R2-L1" }],
}

// ---------- Layouts --------------------------------------------------------

const IMPORTS_LAYOUT: GridLayout<ImportFixture> = {
  leadingControls: [{ key: "select", kind: "selection", width: 40 }],
  dataColumns: [
    { key: "importNumber", label: "Import #", minWidth: 120, grow: 0 },
    { key: "tag", label: "Tag", minWidth: 140, grow: 1 },
    { key: "warehouseName", label: "Warehouse", minWidth: 160, grow: 1 },
    { key: "manufacturerName", label: "Manufacturer", minWidth: 160, grow: 1 },
    { key: "percent", label: "Percent", kind: "number", minWidth: 100, grow: 0 },
    { key: "stagedCount", label: "Staged", kind: "number", minWidth: 80, grow: 0 },
    { key: "liveCount", label: "Live", kind: "number", minWidth: 80, grow: 0 },
    { key: "status", label: "Status", kind: "status", minWidth: 120, grow: 0, align: "center" },
  ],
  trailingControls: [{ key: "actions", kind: "actions", width: 80 }],
}

const SECTIONS_LAYOUT: GridLayout<SectionFixture> = {
  dataColumns: [
    { key: "number", label: "Section", minWidth: 200, grow: 1 },
    { key: "locationsCount", label: "Locations", kind: "number", minWidth: 120, grow: 0 },
  ],
  trailingControls: [
    { key: "expand", kind: "expand", width: 60 },
    { key: "remove", kind: "actions", width: 60 },
  ],
}

const LOCATIONS_LAYOUT: GridLayout<LocationFixture> = {
  dataColumns: [
    { key: "rafter", label: "Rafter", kind: "number", minWidth: 100, grow: 0 },
    { key: "level", label: "Level", kind: "number", minWidth: 100, grow: 0 },
    { key: "label", label: "Label", minWidth: 200, grow: 1 },
  ],
  trailingControls: [{ key: "remove", kind: "actions", width: 60 }],
}

// ---------- Section helper -------------------------------------------------

function SmokeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-[var(--panel-border)] pb-2 text-lg font-semibold text-[var(--foreground)]">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  )
}

// ---------- Page -----------------------------------------------------------

export default function ComponentsSmokePage() {
  // Form state for FieldSection
  const [orderNumber, setOrderNumber] = useState("PO-12345")
  const [tag, setTag] = useState("Spring 24")
  const [notes, setNotes] = useState("Held at the dock until Tuesday")
  const [warehouseId, setWarehouseId] = useState("")
  const [manufacturerId, setManufacturerId] = useState<string | null>(null)
  const [stockingStock, setStockingStock] = useState("125.00")
  const [unitPrice, setUnitPrice] = useState("12.50")
  const [coverage, setCoverage] = useState("0.85")
  const [archived, setArchived] = useState(false)

  // Selection state for streaming Grid
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Expand state for scoped rows
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set(["sec-1"]))
  function toggleExpand(id: string) {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Feature controls
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<string | null>("importNumber")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          components/ smoke page
        </h1>
        <p className="text-sm text-[var(--foreground)]/65">
          Throwaway visual check for every primitive. Delete this page before merging the next
          migration sweep.
        </p>
      </header>

      {/* ---------------- Field Section ---------------- */}
      <SmokeSection title="FieldSection (8-col invisible LayoutGrid)">
        <FieldSection>
          <CellAt col={1} colSpan={2}>
            <FormField label="Order Number">
              <TextCell editable={true} value={orderNumber} onChange={setOrderNumber} />
            </FormField>
          </CellAt>
          <CellAt col={3} colSpan={2}>
            <FormField label="Tag">
              <TextCell editable={true} value={tag} onChange={setTag} />
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={2}>
            <FormField label="Warehouse" required>
              <SelectCell
                editable={true}
                value={warehouseId}
                onChange={setWarehouseId}
                options={[
                  { value: "wh-1", label: "Warehouse 1" },
                  { value: "wh-2", label: "Warehouse 2" },
                ]}
                placeholder="Select Warehouse"
              />
            </FormField>
          </CellAt>
          <CellAt col={7} colSpan={2}>
            <FormField label="Manufacturer" hint="Optional">
              <DropdownCell
                editable={true}
                value={manufacturerId}
                onChange={setManufacturerId}
                options={[
                  { id: "mfr-1", label: "Acme Flooring" },
                  { id: "mfr-2", label: "Mohawk" },
                  { id: "mfr-3", label: "Shaw" },
                ]}
                allowClear={true}
                placeholder="Select Manufacturer"
              />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="Starting Stock">
              <UnitCell editable={true} value={stockingStock} onChange={setStockingStock} unit="sqft" />
            </FormField>
          </CellAt>
          <CellAt col={3} colSpan={2}>
            <FormField label="Unit Price">
              <CurrencyCell editable={true} value={unitPrice} onChange={setUnitPrice} />
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={2}>
            <FormField label="Coverage">
              <PerUnitCell editable={true} value={coverage} onChange={setCoverage} unit="sqft" />
            </FormField>
          </CellAt>
          <CellAt col={7} colSpan={2}>
            <FormField label="Archived">
              <CheckboxCell editable={true} value={archived} onChange={setArchived} />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={8}>
            <FormField label="Notes" error={!notes ? "Notes are required" : undefined}>
              <TextCell editable={true} value={notes} onChange={setNotes} />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={4}>
            <FormField label="Static field (composed value)">
              <StaticFieldValue tone="muted">
                IMP-0001 · 12 / 12 rows imported
              </StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={4}>
            <FormField label="Status">
              <StatusCell editable={false} value="IMPORTED" badgeTone="success" />
            </FormField>
          </CellAt>
        </FieldSection>
      </SmokeSection>

      {/* ---------------- Cells (static) ---------------- */}
      <SmokeSection title="Cells in static / read-only mode">
        <FieldSection>
          <CellAt col={1} colSpan={2}>
            <FormField label="TextCell">
              <TextCell editable={false} value="Hello world" />
            </FormField>
          </CellAt>
          <CellAt col={3} colSpan={2}>
            <FormField label="NumberCell">
              <NumberCell editable={false} value="42.50" />
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={2}>
            <FormField label="CurrencyCell">
              <CurrencyCell editable={false} value="1234.50" />
            </FormField>
          </CellAt>
          <CellAt col={7} colSpan={2}>
            <FormField label="UnitCell">
              <UnitCell editable={false} value="125.00" unit="sqft" />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={2}>
            <FormField label="PerUnitCell">
              <PerUnitCell editable={false} value="0.85" unit="sqft" />
            </FormField>
          </CellAt>
          <CellAt col={3} colSpan={2}>
            <FormField label="SelectCell">
              <SelectCell
                editable={false}
                value="wh-1"
                onChange={() => {}}
                options={[
                  { value: "wh-1", label: "Warehouse 1" },
                  { value: "wh-2", label: "Warehouse 2" },
                ]}
              />
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={2}>
            <FormField label="DropdownCell">
              <DropdownCell
                editable={false}
                value="mfr-1"
                onChange={() => {}}
                options={[
                  { id: "mfr-1", label: "Acme Flooring" },
                  { id: "mfr-2", label: "Mohawk" },
                ]}
              />
            </FormField>
          </CellAt>
          <CellAt col={7} colSpan={2}>
            <FormField label="CheckboxCell">
              <CheckboxCell editable={false} value={true} />
            </FormField>
          </CellAt>
        </FieldSection>
      </SmokeSection>

      {/* ---------------- Streaming Grid ---------------- */}
      <SmokeSection title="Grid (streaming rows + leading + trailing controls)">
        <Grid<ImportFixture>
          rows={IMPORT_FIXTURES}
          layout={IMPORTS_LAYOUT}
          renderCell={(column, row) => {
            switch (column.key) {
              case "importNumber":
                return (
                  <span className="font-medium text-blue-500">{row.importNumber}</span>
                )
              case "status":
                return (
                  <StatusBadge
                    tone={
                      row.status === "IMPORTED"
                        ? "success"
                        : row.status === "QUEUED"
                          ? "processing"
                          : "default"
                    }
                  >
                    {row.status}
                  </StatusBadge>
                )
              case "percent":
                return <span className="tabular-nums">{row.percent}%</span>
              default: {
                const value = (row as Record<string, unknown>)[column.key]
                return value === null || value === undefined || value === ""
                  ? "-"
                  : String(value)
              }
            }
          }}
          renderControl={(control, row) => {
            if (control.kind === "selection") {
              return (
                <CheckboxCell
                  editable={true}
                  value={selectedIds.has(row.id)}
                  onChange={() => toggleSelection(row.id)}
                  ariaLabel={`Select ${row.importNumber}`}
                />
              )
            }
            if (control.kind === "actions") {
              return (
                <button
                  type="button"
                  onClick={() => alert(`Delete ${row.importNumber}`)}
                  className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-700 hover:bg-rose-500/20"
                >
                  Delete
                </button>
              )
            }
            return null
          }}
        />
        <p className="mt-2 text-xs text-[var(--foreground)]/55">
          Selected: {selectedIds.size === 0 ? "none" : Array.from(selectedIds).join(", ")}
        </p>
      </SmokeSection>

      {/* ---------------- Scoped child rows ---------------- */}
      <SmokeSection title="Grid + ScopedRow (warehouse sections-locations precedent)">
        <Grid<SectionFixture>
          rows={SECTION_FIXTURES}
          layout={SECTIONS_LAYOUT}
          renderRow={(section) => {
            const isExpanded = expandedSectionIds.has(section.id)
            const childRows = LOCATIONS_BY_SECTION[section.id] ?? []
            return (
              <Fragment>
                <GridBodyRow
                  row={section}
                  layout={SECTIONS_LAYOUT}
                  scroll={{
                    noWrapHeaders: true,
                    growToFitText: true,
                    headerSticky: false,
                    syncHorizontalScroll: true,
                  }}
                  templateColumns="minmax(12.5rem, 1fr) 7.5rem 3.75rem 3.75rem"
                  renderControl={(control) => {
                    if (control.kind === "expand") {
                      return (
                        <button
                          type="button"
                          onClick={() => toggleExpand(section.id)}
                          aria-expanded={isExpanded}
                          className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-xs"
                        >
                          {isExpanded ? "▾" : "▸"}
                        </button>
                      )
                    }
                    if (control.kind === "actions") {
                      return (
                        <button
                          type="button"
                          className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-700"
                        >
                          ✕
                        </button>
                      )
                    }
                    return null
                  }}
                />
                {isExpanded
                  ? childRows.map((location) => (
                      <ScopedRow<LocationFixture>
                        key={location.id}
                        row={location}
                        layout={LOCATIONS_LAYOUT}
                        renderControl={(control) =>
                          control.kind === "actions" ? (
                            <button
                              type="button"
                              className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-700"
                            >
                              ✕
                            </button>
                          ) : null
                        }
                      />
                    ))
                  : null}
              </Fragment>
            )
          }}
        />
      </SmokeSection>

      {/* ---------------- LayoutGrid + chart-span placeholder ---------------- */}
      <SmokeSection title="LayoutGrid (positioned cells, future chart-span shape)">
        <LayoutGrid geometry={{ columns: 8, rows: 4, chrome: "visible", gap: "0.75rem" }}>
          <CellAt col={1} colSpan={3} rowSpan={2}>
            <div className="flex h-full min-h-[8rem] items-center justify-center rounded-md border border-dashed border-[var(--panel-border)] bg-[var(--panel-border)]/10 text-sm text-[var(--foreground)]/55">
              Bar chart goes here
              <br />
              (col 1-3, row 1-2)
            </div>
          </CellAt>
          <CellAt col={4} colSpan={5}>
            <div className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-3 text-sm">
              Top-right tile (col 4-8, row 1)
            </div>
          </CellAt>
          <CellAt col={4} colSpan={2}>
            <div className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-3 text-sm">
              col 4-5
            </div>
          </CellAt>
          <CellAt col={6} colSpan={3}>
            <div className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-3 text-sm">
              col 6-8
            </div>
          </CellAt>
          <CellAt col={1} colSpan={8}>
            <div className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-3 text-sm">
              Full row (col 1-8, row 4)
            </div>
          </CellAt>
        </LayoutGrid>
      </SmokeSection>

      {/* ---------------- Dropdowns ---------------- */}
      <SmokeSection title="Dropdowns (standalone)">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">SelectDropdown</h3>
            <SelectDropdown
              value={manufacturerId}
              onChange={setManufacturerId}
              options={[
                { id: "mfr-1", label: "Acme Flooring", hint: "Tile + LVP" },
                { id: "mfr-2", label: "Mohawk", hint: "Carpet + LVP" },
                { id: "mfr-3", label: "Shaw" },
                { id: "mfr-4", label: "Disabled option", disabled: true },
              ]}
              allowClear
              placeholder="Select…"
              ariaLabel="Manufacturer"
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">SearchDropdown</h3>
            <SearchDropdown
              value={manufacturerId}
              onChange={setManufacturerId}
              options={[
                { id: "mfr-1", label: "Acme Flooring" },
                { id: "mfr-2", label: "Mohawk" },
                { id: "mfr-3", label: "Shaw" },
                { id: "mfr-4", label: "Tarkett" },
              ]}
              placeholder="Pick…"
              ariaLabel="Manufacturer"
            />
          </div>
        </div>
      </SmokeSection>

      {/* ---------------- Badges ---------------- */}
      <SmokeSection title="Badges (StatusBadge + TonePill in every tone)">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase text-[var(--foreground)]/60">StatusBadge</span>
            <StatusBadge tone="default">Default</StatusBadge>
            <StatusBadge tone="success">Success</StatusBadge>
            <StatusBadge tone="warning">Warning</StatusBadge>
            <StatusBadge tone="error">Error</StatusBadge>
            <StatusBadge tone="processing">Processing</StatusBadge>
            <StatusBadge tone="muted">Muted</StatusBadge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase text-[var(--foreground)]/60">TonePill</span>
            <TonePill tone="default">Default</TonePill>
            <TonePill tone="success">Success</TonePill>
            <TonePill tone="warning">Warning</TonePill>
            <TonePill tone="error">Error</TonePill>
            <TonePill tone="processing">Processing</TonePill>
            <TonePill tone="muted">Muted</TonePill>
          </div>
        </div>
      </SmokeSection>

      {/* ---------------- Headers ---------------- */}
      <SmokeSection title="Headers (SectionHeader + ActionHeader)">
        <div className="space-y-4">
          <div className="rounded-md border border-[var(--panel-border)]">
            <SectionHeader
              title="Inventory"
              subtitle="Live inventory across all warehouses"
              actions={[
                { key: "filter", label: "Filter", onClick: () => {} },
                { key: "new", label: "New Inventory", onClick: () => {}, kind: "primary" },
              ]}
            />
            <div className="px-4 py-3 text-sm text-[var(--foreground)]/65">Section body…</div>
          </div>
          <div className="rounded-md border border-[var(--panel-border)]">
            <ActionHeader
              title="Mark for import"
              summary={`${selectedIds.size} row${selectedIds.size === 1 ? "" : "s"} selected`}
              status={{ tone: "processing", label: "Worker queued", detail: "Eta ~30s" }}
              actions={[
                { key: "cancel", label: "Cancel", onClick: () => {}, kind: "secondary" },
                { key: "run", label: "Run Import", onClick: () => {}, kind: "primary" },
              ]}
              error={selectedIds.size === 0 ? "Select at least one row to continue" : undefined}
            />
            <div className="px-4 py-3 text-sm text-[var(--foreground)]/65">Section body…</div>
          </div>
        </div>
      </SmokeSection>

      {/* ---------------- Feature controls ---------------- */}
      <SmokeSection title="Feature controls (search, sort, group, paginate)">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="mb-2 text-sm font-medium">SearchControl</h3>
              <SearchControl
                query={searchQuery}
                onQueryChange={setSearchQuery}
                placeholder="Search imports…"
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">SortToggle</h3>
              <SortToggle
                sortKey={sortKey}
                direction={sortDirection}
                onChange={({ direction }) => setSortDirection(direction)}
                ascendingLabel="Oldest first"
                descendingLabel="Newest first"
              />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">GroupTree</h3>
            <GroupTree<ImportFixture>
              groups={[
                { key: "wh-1", label: "Warehouse 1", rows: IMPORT_FIXTURES.filter((r) => r.warehouseName === "Warehouse 1") },
                { key: "wh-2", label: "Warehouse 2", rows: IMPORT_FIXTURES.filter((r) => r.warehouseName === "Warehouse 2") },
              ]}
              renderRow={(row) => (
                <div className="px-4 py-2 text-sm">
                  {row.importNumber} · {row.tag || "—"} · {row.manufacturerName}
                </div>
              )}
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">PaginateControls</h3>
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
          </div>
        </div>
      </SmokeSection>
    </div>
  )
}
