"use client"

// Smoke page mirroring the imports record view (`/dashboard/imports/[id]`).
// Two sections:
//   1. Primary section  — invisible 8-col FieldSection for the import header.
//   2. Staged inventory — streaming Grid with selection control + status
//      indicator; demonstrates how the mark-for-import workflow will compose.
//
// Pure visual rehearsal — no domain types imported, no controllers, no API.
//
// DELETE BEFORE MERGING THE NEXT MIGRATION SWEEP:
//   rm -rf apps/web/app/components-smoke

import Link from "next/link"
import { useState } from "react"
import { Grid, type GridLayout, type GridRow } from "@/components/grid"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import {
  TextCell,
  CurrencyCell,
  UnitCell,
  SelectCell,
  DropdownCell,
  CheckboxCell,
} from "@/components/cells"
import { StatusBadge } from "@/components/badges"
import { SectionHeader, ActionHeader } from "@/components/headers"

// ---------- Fixture types --------------------------------------------------

type StagedRowFixture = GridRow & {
  productId: string
  itemNumber: string
  startingStock: string
  locationId: string
  dyeLot: string
  cost: string
  freight: string
  notes: string
  categoryFilterId: string | null
  status: "DRAFT" | "QUEUED" | "IMPORTED"
}

const PRODUCTS = [
  { id: "prd-1", label: "Oak Plank — Natural", categoryId: "cat-1" },
  { id: "prd-2", label: "Oak Plank — Smoked", categoryId: "cat-1" },
  { id: "prd-3", label: "LVT Tile — Slate", categoryId: "cat-2" },
  { id: "prd-4", label: "Carpet — Berber Beige", categoryId: "cat-3" },
] as const

const CATEGORIES = [
  { id: "cat-1", label: "Hardwood" },
  { id: "cat-2", label: "LVT" },
  { id: "cat-3", label: "Carpet" },
]

const LOCATIONS = [
  { value: "loc-1", label: "R1-L1" },
  { value: "loc-2", label: "R1-L2" },
  { value: "loc-3", label: "R2-L1" },
]

const MANUFACTURERS = [
  { id: "mfr-1", label: "Acme Flooring" },
  { id: "mfr-2", label: "Mohawk" },
  { id: "mfr-3", label: "Shaw" },
]

const WAREHOUSES = [
  { value: "wh-1", label: "Warehouse 1" },
  { value: "wh-2", label: "Warehouse 2" },
]

// ---------- Fixture data ---------------------------------------------------

const INITIAL_STAGED_ROWS: StagedRowFixture[] = [
  {
    id: "row-1",
    productId: "prd-1",
    itemNumber: "ITEM-001",
    startingStock: "125.00",
    locationId: "loc-1",
    dyeLot: "DL-1234",
    cost: "12.50",
    freight: "0.40",
    notes: "First pallet",
    categoryFilterId: null,
    status: "IMPORTED",
    tone: "success",
  },
  {
    id: "row-2",
    productId: "prd-2",
    itemNumber: "ITEM-002",
    startingStock: "80.00",
    locationId: "loc-1",
    dyeLot: "DL-1234",
    cost: "13.00",
    freight: "0.40",
    notes: "",
    categoryFilterId: null,
    status: "QUEUED",
    tone: "warning",
  },
  {
    id: "row-3",
    productId: "prd-3",
    itemNumber: "ITEM-003",
    startingStock: "200.00",
    locationId: "loc-2",
    dyeLot: "",
    cost: "8.25",
    freight: "0.30",
    notes: "Held at the dock",
    categoryFilterId: null,
    status: "DRAFT",
  },
  {
    id: "row-4",
    productId: "",
    itemNumber: "",
    startingStock: "",
    locationId: "",
    dyeLot: "",
    cost: "",
    freight: "",
    notes: "",
    categoryFilterId: "cat-1",
    status: "DRAFT",
  },
]

// ---------- Layouts --------------------------------------------------------

const STAGED_ROWS_LAYOUT: GridLayout<StagedRowFixture> = {
  leadingControls: [{ key: "select", kind: "selection", width: 40 }],
  dataColumns: [
    { key: "categoryFilter", label: "Filter", minWidth: 132, grow: 0 },
    { key: "product", label: "Product", minWidth: 220, grow: 1.3 },
    { key: "itemNumber", label: "Item #", minWidth: 116, grow: 0 },
    { key: "startingStock", label: "Starting Stock", minWidth: 156, grow: 0, align: "center" },
    { key: "location", label: "Location", minWidth: 140, grow: 0 },
    { key: "dyeLot", label: "Dye Lot", minWidth: 124, grow: 0 },
    { key: "cost", label: "Cost", kind: "currency", minWidth: 116, grow: 0, align: "end" },
    { key: "freight", label: "Freight", kind: "currency", minWidth: 116, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 200, grow: 1 },
  ],
  trailingControls: [
    { key: "status", kind: "status-indicator", width: 116 },
    { key: "remove", kind: "actions", width: 60 },
  ],
}

// ---------- Page -----------------------------------------------------------

export default function ImportsRecordSmokePage() {
  // Primary section state
  const [orderNumber, setOrderNumber] = useState("PO-12345")
  const [tag, setTag] = useState("Spring 24")
  const [notes, setNotes] = useState("Held at the dock until Tuesday")
  const [warehouseId, setWarehouseId] = useState("wh-1")
  const [manufacturerId, setManufacturerId] = useState<string | null>("mfr-1")

  // Staged-rows state
  const [rows, setRows] = useState(INITIAL_STAGED_ROWS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function updateRow(id: string, patch: Partial<StagedRowFixture>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function addRow() {
    const newId = `row-${Date.now()}`
    setRows((prev) => [
      ...prev,
      {
        id: newId,
        productId: "",
        itemNumber: "",
        startingStock: "",
        locationId: "",
        dyeLot: "",
        cost: "",
        freight: "",
        notes: "",
        categoryFilterId: null,
        status: "DRAFT",
      },
    ])
  }

  // Status badge tone for the trailing status-indicator control
  function statusTone(status: StagedRowFixture["status"]) {
    if (status === "QUEUED") return "processing" as const
    if (status === "IMPORTED") return "success" as const
    return "default" as const
  }

  // Editable rows are DRAFT only (matches sweep 4e contract — QUEUED/IMPORTED locked).
  function isRowEditable(row: StagedRowFixture) {
    return row.status === "DRAFT"
  }

  // Eligible for mark-for-import = DRAFT + has a product + has stock.
  const eligibleSelectedIds = Array.from(selectedIds).filter((id) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return false
    return row.status === "DRAFT" && row.productId && row.startingStock
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <SmokeNav />

      {/* ---------------- Page header ---------------- */}
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Import IMP-0002"
          subtitle="Mirror of `/dashboard/imports/[id]` — visual rehearsal only"
          actions={[
            { key: "back", label: "Back to list", onClick: () => {}, kind: "secondary" },
          ]}
        />
      </div>

      {/* ---------------- Primary section (invisible 8-col FieldSection) ---------------- */}
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <ActionHeader
          title="Import Details"
          status={{ tone: "default", label: "Saved" }}
          actions={[
            { key: "discard", label: "Discard", onClick: () => {}, kind: "secondary" },
            { key: "save", label: "Save Import", onClick: () => {}, kind: "primary" },
          ]}
        />
        <div className="px-4 py-4">
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
                  options={WAREHOUSES}
                  placeholder="Select Warehouse"
                />
              </FormField>
            </CellAt>
            <CellAt col={7} colSpan={2}>
              <FormField label="Manufacturer">
                <DropdownCell
                  editable={true}
                  value={manufacturerId}
                  onChange={setManufacturerId}
                  options={MANUFACTURERS}
                  allowClear={true}
                  placeholder="Select Manufacturer"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Notes">
                <TextCell editable={true} value={notes} onChange={setNotes} />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={2}>
              <FormField label="Percent">
                <StaticFieldValue tone="muted">37%</StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={3} colSpan={3}>
              <FormField label="Created">
                <StaticFieldValue tone="muted">2026-04-08 09:14</StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={6} colSpan={3}>
              <FormField label="Updated">
                <StaticFieldValue tone="muted">2026-04-25 18:31</StaticFieldValue>
              </FormField>
            </CellAt>
          </FieldSection>
        </div>
      </div>

      {/* ---------------- Staged Inventory section ---------------- */}
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <ActionHeader
          title="Staged Inventory Rows"
          summary={
            <span>
              {rows.length} row{rows.length === 1 ? "" : "s"} ·{" "}
              {selectedIds.size === 0
                ? "none selected"
                : `${selectedIds.size} selected (${eligibleSelectedIds.length} eligible)`}
            </span>
          }
          status={
            eligibleSelectedIds.length > 0
              ? { tone: "processing", label: "Ready to queue", detail: "Worker will materialize on Run" }
              : undefined
          }
          actions={[
            { key: "add", label: "+ Add Row", onClick: addRow, kind: "secondary" },
            {
              key: "run",
              label: "Run Import",
              onClick: () => alert(`Marking ${eligibleSelectedIds.length} rows for import`),
              kind: "primary",
              disabled: eligibleSelectedIds.length === 0,
            },
          ]}
          error={
            selectedIds.size > 0 && eligibleSelectedIds.length === 0
              ? "None of the selected rows are eligible for import. DRAFT rows with a product + stock are required."
              : undefined
          }
        />

        <Grid<StagedRowFixture>
          rows={rows}
          layout={STAGED_ROWS_LAYOUT}
          renderCell={(column, row) => {
            const editable = isRowEditable(row)
            switch (column.key) {
              case "categoryFilter":
                return (
                  <DropdownCell
                    editable={editable}
                    value={row.categoryFilterId}
                    onChange={(next) => updateRow(row.id, { categoryFilterId: next })}
                    options={CATEGORIES}
                    allowClear={true}
                    placeholder="All categories"
                  />
                )
              case "product": {
                const visibleProducts = row.categoryFilterId
                  ? PRODUCTS.filter(
                      (p) => p.categoryId === row.categoryFilterId || p.id === row.productId,
                    )
                  : PRODUCTS
                return (
                  <DropdownCell
                    editable={editable}
                    value={row.productId || null}
                    onChange={(next) => updateRow(row.id, { productId: next ?? "" })}
                    options={visibleProducts.map((p) => ({ id: p.id, label: p.label }))}
                    placeholder="Select product"
                  />
                )
              }
              case "itemNumber":
                return (
                  <TextCell
                    editable={editable}
                    value={row.itemNumber}
                    onChange={(next) => updateRow(row.id, { itemNumber: next })}
                  />
                )
              case "startingStock":
                return (
                  <UnitCell
                    editable={editable}
                    value={row.startingStock}
                    onChange={(next) => updateRow(row.id, { startingStock: next })}
                    unit="sqft"
                  />
                )
              case "location":
                return (
                  <SelectCell
                    editable={editable}
                    value={row.locationId}
                    onChange={(next) => updateRow(row.id, { locationId: next })}
                    options={LOCATIONS}
                    placeholder="Select location"
                  />
                )
              case "dyeLot":
                return (
                  <TextCell
                    editable={editable}
                    value={row.dyeLot}
                    onChange={(next) => updateRow(row.id, { dyeLot: next })}
                  />
                )
              case "cost":
                return (
                  <CurrencyCell
                    editable={editable}
                    value={row.cost}
                    onChange={(next) => updateRow(row.id, { cost: next })}
                  />
                )
              case "freight":
                return (
                  <CurrencyCell
                    editable={editable}
                    value={row.freight}
                    onChange={(next) => updateRow(row.id, { freight: next })}
                  />
                )
              case "notes":
                return (
                  <TextCell
                    editable={editable}
                    value={row.notes}
                    onChange={(next) => updateRow(row.id, { notes: next })}
                  />
                )
              default:
                return null
            }
          }}
          renderControl={(control, row) => {
            if (control.kind === "selection") {
              return (
                <CheckboxCell
                  editable={isRowEditable(row)}
                  value={selectedIds.has(row.id)}
                  onChange={() => toggleSelection(row.id)}
                  ariaLabel={`Select row ${row.itemNumber || row.id}`}
                />
              )
            }
            if (control.kind === "status-indicator") {
              return <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
            }
            if (control.kind === "actions") {
              return (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={!isRowEditable(row)}
                  className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-700 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ✕
                </button>
              )
            }
            return null
          }}
        />
      </div>
    </div>
  )
}

// ---------- Local nav ------------------------------------------------------

function SmokeNav() {
  return (
    <nav className="flex gap-3 text-sm">
      <Link href="/components-smoke" className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]">
        ← Primitive catalog
      </Link>
      <span className="text-[var(--foreground)]/45">/</span>
      <Link
        href="/components-smoke/imports-list"
        className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]"
      >
        Imports list
      </Link>
      <span className="text-[var(--foreground)]/45">·</span>
      <span className="text-[var(--foreground)] font-medium">Imports record</span>
    </nav>
  )
}
