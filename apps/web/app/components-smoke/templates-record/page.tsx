"use client"

// Smoke page mirroring the templates record view (`/dashboard/templates/[id]`).
// Two sections:
//   1. Primary section  — invisible 8-col FieldSection for template metadata
//      (management company, property, job type, unit type, warehouse + 4
//      long-form text areas).
//   2. Material Items   — streaming Grid with add/save/discard, mirroring the
//      controller surface used by the imports staged-rows section.
//
// Pure visual rehearsal — no domain types imported, no controllers, no API.
//
// Sibling smokes:
//   - /components-smoke                — inventory record + cut logs
//   - /components-smoke/inventory-list — inventory list
//   - /components-smoke/templates-list — templates list
//
// DELETE BEFORE MERGING THE NEXT MIGRATION SWEEP:
//   rm -rf apps/web/app/components-smoke

import Link from "next/link"
import { useState } from "react"
import { Grid, GridEmpty, type GridLayout, type GridRow } from "@/components/grid"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import {
  CurrencyCell,
  DropdownCell,
  NumberCell,
  RowActionButton,
  SelectCell,
  TextCell,
  TextareaCell,
} from "@/components/cells"
import { ActionHeader, SectionHeader } from "@/components/headers"

// ---------- Form fixture types ---------------------------------------------

const MANAGEMENT_COMPANIES = [
  { value: "mc-1", label: "Bluepoint Management" },
  { value: "mc-2", label: "Holcomb Properties" },
  { value: "mc-3", label: "Brookhurst Commercial" },
]

const PROPERTIES = [
  { value: "prop-1", label: "Mercer Apartments" },
  { value: "prop-2", label: "Holcomb Lofts" },
  { value: "prop-3", label: "Patel Row" },
  { value: "prop-4", label: "Brookhurst Plaza" },
]

const JOB_TYPES = [
  { value: "jt-1", label: "Make-Ready" },
  { value: "jt-2", label: "Renovation" },
  { value: "jt-3", label: "Premium Turn" },
  { value: "jt-4", label: "Tenant Improvement" },
]

const WAREHOUSES = [
  { value: "wh-1", label: "Darby" },
  { value: "wh-2", label: "Holcomb" },
]

const CATEGORIES = [
  { id: "cat-vinyl", label: "Vinyl" },
  { id: "cat-tile", label: "Tile / LVT" },
  { id: "cat-carpet", label: "Carpet" },
  { id: "cat-hardwood", label: "Hardwood" },
  { id: "cat-underlayment", label: "Underlayment / pad" },
  { id: "cat-trim", label: "Trim / accessory" },
]

const PRODUCT_OPTIONS: ReadonlyArray<{ id: string; label: string; categoryId: string }> = [
  { id: "prd-1", label: "Vinyl Plank — XL Cyrus Grayton", categoryId: "cat-vinyl" },
  { id: "prd-2", label: "Vinyl Plank — Coastal Oak", categoryId: "cat-vinyl" },
  { id: "prd-3", label: "LVT Tile — Slate Grey", categoryId: "cat-tile" },
  { id: "prd-4", label: "Carpet — Berber Beige", categoryId: "cat-carpet" },
  { id: "prd-5", label: "Hardwood — White Oak Smoked", categoryId: "cat-hardwood" },
  { id: "prd-6", label: "Carpet Pad — 8lb rebond", categoryId: "cat-underlayment" },
  { id: "prd-7", label: "Underlayment — 3mm cork", categoryId: "cat-underlayment" },
  { id: "prd-8", label: "Trim — White 1/4 round", categoryId: "cat-trim" },
]

// ---------- Material item fixture ------------------------------------------

type MaterialItemFixture = GridRow & {
  categoryFilterId: string | null
  productId: string
  quantity: string
  unitPrice: string
  notes: string
}

const INITIAL_MATERIAL_ITEMS: MaterialItemFixture[] = [
  {
    id: "mi-1",
    categoryFilterId: null,
    productId: "prd-1",
    quantity: "28.00",
    unitPrice: "55.00",
    notes: "Living room + kitchen",
  },
  {
    id: "mi-2",
    categoryFilterId: "cat-underlayment",
    productId: "prd-7",
    quantity: "28.00",
    unitPrice: "1.20",
    notes: "Sound underlay under vinyl plank",
  },
  {
    id: "mi-3",
    categoryFilterId: "cat-carpet",
    productId: "prd-4",
    quantity: "32.00",
    unitPrice: "11.00",
    notes: "Both bedrooms",
  },
  {
    id: "mi-4",
    categoryFilterId: "cat-underlayment",
    productId: "prd-6",
    quantity: "32.00",
    unitPrice: "0.85",
    notes: "Carpet pad",
  },
  {
    id: "mi-5",
    categoryFilterId: "cat-trim",
    productId: "prd-8",
    quantity: "120.00",
    unitPrice: "0.65",
    notes: "Quarter round in linear feet",
  },
  {
    id: "mi-6",
    categoryFilterId: null,
    productId: "",
    quantity: "",
    unitPrice: "",
    notes: "",
  },
]

// ---------- Layout ---------------------------------------------------------

const MATERIAL_ITEMS_LAYOUT: GridLayout<MaterialItemFixture> = {
  dataColumns: [
    { key: "categoryFilter", label: "Category", minWidth: 160, grow: 0 },
    { key: "product", label: "Product", minWidth: 260, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 120, grow: 0, align: "end" },
    { key: "unitPrice", label: "Unit Price", kind: "currency", minWidth: 120, grow: 0, align: "end" },
    { key: "lineTotal", label: "Line Total", kind: "currency", minWidth: 130, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
  ],
  trailingControls: [{ key: "remove", kind: "actions", width: 72 }],
}

// ---------- Helpers --------------------------------------------------------

function calculateLineTotal(quantity: string, unitPrice: string): string {
  const q = parseFloat(quantity || "0")
  const u = parseFloat(unitPrice || "0")
  if (Number.isNaN(q) || Number.isNaN(u)) return ""
  return (q * u).toFixed(2)
}

function calculateGrandTotal(items: MaterialItemFixture[]): string {
  const total = items.reduce((acc, item) => {
    const line = parseFloat(calculateLineTotal(item.quantity, item.unitPrice) || "0")
    return acc + (Number.isNaN(line) ? 0 : line)
  }, 0)
  return total.toFixed(2)
}

// ---------- Page -----------------------------------------------------------

export default function TemplatesRecordSmokePage() {
  // ----- Primary section state
  const [managementCompanyId, setManagementCompanyId] = useState("mc-1")
  const [propertyId, setPropertyId] = useState("prop-1")
  const [jobTypeId, setJobTypeId] = useState("jt-1")
  const [unitType, setUnitType] = useState("2BR/2BA")
  const [warehouseId, setWarehouseId] = useState("wh-1")
  const [description, setDescription] = useState("Standard 2BR turn — vinyl plank + carpet bedrooms")
  const [instructions, setInstructions] = useState(
    "Pull existing carpet/pad on day 1. Vinyl install day 2. Carpet install day 3. Punch list before key handoff.",
  )
  const [propertyInstructions, setPropertyInstructions] = useState(
    "Notify Bluepoint front desk before crew arrival. Use freight elevator only.",
  )
  const [templateNotes, setTemplateNotes] = useState("")
  const [isPrimaryDirty, setIsPrimaryDirty] = useState(false)
  const [isPrimarySaving, setIsPrimarySaving] = useState(false)
  const [primaryNoticeMessage, setPrimaryNoticeMessage] = useState<string | null>("Saved")

  function markPrimaryDirty() {
    setIsPrimaryDirty(true)
    setPrimaryNoticeMessage(null)
  }

  function savePrimary() {
    setIsPrimarySaving(true)
    setTimeout(() => {
      setIsPrimarySaving(false)
      setIsPrimaryDirty(false)
      setPrimaryNoticeMessage("Template saved")
    }, 300)
  }

  function discardPrimary() {
    setIsPrimaryDirty(false)
    setPrimaryNoticeMessage(null)
  }

  // ----- Material items section state (mirrors `useTemplateMaterialItemsSection`)
  const [items, setItems] = useState(INITIAL_MATERIAL_ITEMS)
  const [savedItemsSnapshot, setSavedItemsSnapshot] = useState(INITIAL_MATERIAL_ITEMS)
  const [isItemsSaving, setIsItemsSaving] = useState(false)
  const [itemsNoticeMessage, setItemsNoticeMessage] = useState<string | null>(null)

  const isItemsDirty = JSON.stringify(items) !== JSON.stringify(savedItemsSnapshot)

  function updateItem(id: string, patch: Partial<MaterialItemFixture>) {
    setItemsNoticeMessage(null)
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function removeItem(id: string) {
    setItemsNoticeMessage(null)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function addItem() {
    setItemsNoticeMessage(null)
    setItems((prev) => [
      ...prev,
      {
        id: `mi-${Date.now()}`,
        categoryFilterId: null,
        productId: "",
        quantity: "",
        unitPrice: "",
        notes: "",
      },
    ])
  }

  function discardItems() {
    setItems(savedItemsSnapshot)
    setItemsNoticeMessage(null)
  }

  function saveItems() {
    setIsItemsSaving(true)
    setTimeout(() => {
      setSavedItemsSnapshot(items)
      setIsItemsSaving(false)
      setItemsNoticeMessage("Material items saved")
    }, 350)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <SmokeNav />

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Templates record smoke
        </h1>
        <p className="text-sm text-[var(--foreground)]/65">
          Visual rehearsal of <code className="rounded bg-[var(--panel-border)]/30 px-1">/dashboard/templates/[id]</code>{" "}
          on top of the new <code className="rounded bg-[var(--panel-border)]/30 px-1">apps/web/components/</code> primitives.
          Two sections: primary (8-col invisible <code className="rounded bg-[var(--panel-border)]/30 px-1">FieldSection</code>) and material items (streaming <code className="rounded bg-[var(--panel-border)]/30 px-1">Grid</code>).
        </p>
      </header>

      {/* ---------------- Page header ---------------- */}
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Template TPL-0002"
          subtitle="Mercer Apartments · 2BR/2BA · Make-Ready"
          actions={[{ key: "back", label: "Back to list", onClick: () => {}, kind: "secondary" }]}
        />
      </div>

      {/* ---------------- Primary section ---------------- */}
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <ActionHeader
          title="Template Details"
          status={
            isPrimaryDirty
              ? { tone: "warning", label: "Unsaved changes" }
              : { tone: "default", label: "Saved" }
          }
          actions={[
            {
              key: "discard",
              label: "Discard",
              onClick: discardPrimary,
              kind: "secondary",
              disabled: !isPrimaryDirty || isPrimarySaving,
            },
            {
              key: "save",
              label: isPrimarySaving ? "Saving Template..." : "Save Template",
              onClick: savePrimary,
              kind: "primary",
              disabled: !isPrimaryDirty || isPrimarySaving,
            },
          ]}
          message={primaryNoticeMessage}
        />
        <div className="px-4 py-4">
          <FieldSection>
            {/* Row 1: Management Company · Property · Job Type · Unit Type */}
            <CellAt col={1} row={1} colSpan={2}>
              <FormField label="Management Company">
                <SelectCell
                  editable={!isPrimarySaving}
                  value={managementCompanyId}
                  onChange={(v) => {
                    setManagementCompanyId(v)
                    markPrimaryDirty()
                  }}
                  options={MANAGEMENT_COMPANIES}
                  placeholder="No management company"
                />
              </FormField>
            </CellAt>
            <CellAt col={3} row={1} colSpan={2}>
              <FormField label="Property" required>
                <SelectCell
                  editable={!isPrimarySaving}
                  value={propertyId}
                  onChange={(v) => {
                    setPropertyId(v)
                    markPrimaryDirty()
                  }}
                  options={PROPERTIES}
                  placeholder="Select property"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} row={1} colSpan={2}>
              <FormField label="Job Type">
                <SelectCell
                  editable={!isPrimarySaving}
                  value={jobTypeId}
                  onChange={(v) => {
                    setJobTypeId(v)
                    markPrimaryDirty()
                  }}
                  options={JOB_TYPES}
                  placeholder="No job type"
                />
              </FormField>
            </CellAt>
            <CellAt col={7} row={1} colSpan={2}>
              <FormField label="Unit Type">
                <TextCell
                  editable={!isPrimarySaving}
                  value={unitType}
                  onChange={(v) => {
                    setUnitType(v)
                    markPrimaryDirty()
                  }}
                />
              </FormField>
            </CellAt>

            {/* Row 2: Warehouse · Description */}
            <CellAt col={1} row={2} colSpan={2}>
              <FormField label="Warehouse">
                <SelectCell
                  editable={!isPrimarySaving}
                  value={warehouseId}
                  onChange={(v) => {
                    setWarehouseId(v)
                    markPrimaryDirty()
                  }}
                  options={WAREHOUSES}
                  placeholder="No warehouse"
                />
              </FormField>
            </CellAt>
            <CellAt col={3} row={2} colSpan={6}>
              <FormField label="Description">
                <TextCell
                  editable={!isPrimarySaving}
                  value={description}
                  onChange={(v) => {
                    setDescription(v)
                    markPrimaryDirty()
                  }}
                />
              </FormField>
            </CellAt>

            {/* Row 3: Instructions (full width) */}
            <CellAt col={1} row={3} colSpan={8}>
              <FormField label="Instructions" hint="Crew-facing — what gets done in what order">
                <TextareaCell
                  editable={!isPrimarySaving}
                  value={instructions}
                  onChange={(v) => {
                    setInstructions(v)
                    markPrimaryDirty()
                  }}
                  rows={3}
                />
              </FormField>
            </CellAt>

            {/* Row 4: Property Instructions (full width) */}
            <CellAt col={1} row={4} colSpan={8}>
              <FormField label="Property Instructions" hint="Site access, contacts, building rules">
                <TextareaCell
                  editable={!isPrimarySaving}
                  value={propertyInstructions}
                  onChange={(v) => {
                    setPropertyInstructions(v)
                    markPrimaryDirty()
                  }}
                  rows={3}
                />
              </FormField>
            </CellAt>

            {/* Row 5: Template Notes (full width) */}
            <CellAt col={1} row={5} colSpan={8}>
              <FormField label="Template Notes" hint="Internal — won't appear on work orders">
                <TextareaCell
                  editable={!isPrimarySaving}
                  value={templateNotes}
                  onChange={(v) => {
                    setTemplateNotes(v)
                    markPrimaryDirty()
                  }}
                  rows={3}
                />
              </FormField>
            </CellAt>
          </FieldSection>
        </div>
      </div>

      {/* ---------------- Material Items section ---------------- */}
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <ActionHeader
          title="Material Items"
          summary={
            <span>
              {items.length} item{items.length === 1 ? "" : "s"} · grand total{" "}
              <span className="font-medium tabular-nums">${calculateGrandTotal(items)}</span>
            </span>
          }
          actions={[
            {
              key: "add",
              label: "+ Add Material Item",
              onClick: addItem,
              kind: "secondary",
              disabled: isItemsSaving,
            },
            {
              key: "discard",
              label: "Discard",
              onClick: discardItems,
              kind: "secondary",
              disabled: !isItemsDirty || isItemsSaving,
            },
            {
              key: "save",
              label: isItemsSaving ? "Saving Material Items..." : "Save Material Items",
              onClick: saveItems,
              kind: "primary",
              disabled: !isItemsDirty || isItemsSaving,
            },
          ]}
          message={itemsNoticeMessage}
        />

        <Grid<MaterialItemFixture>
          rows={items}
          layout={MATERIAL_ITEMS_LAYOUT}
          empty={<GridEmpty>No material items yet.</GridEmpty>}
          renderCell={(column, row) => {
            switch (column.key) {
              case "categoryFilter":
                return (
                  <DropdownCell
                    editable={!isItemsSaving}
                    value={row.categoryFilterId}
                    onChange={(next) => updateItem(row.id, { categoryFilterId: next })}
                    options={CATEGORIES}
                    allowClear
                    placeholder="All categories"
                    ariaLabel="Material item category filter"
                  />
                )
              case "product": {
                // Filter products by the row's category. Always include the
                // currently-selected product even if it falls outside the filter
                // (mirrors the imports staged-rows category→product cascade).
                const visibleProducts = row.categoryFilterId
                  ? PRODUCT_OPTIONS.filter(
                      (product) =>
                        product.categoryId === row.categoryFilterId || product.id === row.productId,
                    )
                  : PRODUCT_OPTIONS
                return (
                  <DropdownCell
                    editable={!isItemsSaving}
                    value={row.productId || null}
                    onChange={(next) => updateItem(row.id, { productId: next ?? "" })}
                    options={visibleProducts.map(({ id, label }) => ({ id, label }))}
                    placeholder="Select product"
                    ariaLabel="Material item product"
                  />
                )
              }
              case "quantity":
                return (
                  <NumberCell
                    editable={!isItemsSaving}
                    value={row.quantity}
                    onChange={(next) => updateItem(row.id, { quantity: next })}
                    placeholder="Quantity"
                    ariaLabel="Material item quantity"
                  />
                )
              case "unitPrice":
                return (
                  <CurrencyCell
                    editable={!isItemsSaving}
                    value={row.unitPrice}
                    onChange={(next) => updateItem(row.id, { unitPrice: next })}
                    ariaLabel="Material item unit price"
                  />
                )
              case "lineTotal": {
                const total = calculateLineTotal(row.quantity, row.unitPrice)
                return (
                  <CurrencyCell editable={false} value={total} ariaLabel="Line total" />
                )
              }
              case "notes":
                return (
                  <TextCell
                    editable={!isItemsSaving}
                    value={row.notes}
                    onChange={(next) => updateItem(row.id, { notes: next })}
                    ariaLabel="Material item notes"
                  />
                )
              default:
                return null
            }
          }}
          renderControl={(control, row) => {
            if (control.kind === "actions") {
              return (
                <RowActionButton
                  label="✕"
                  ariaLabel={`Remove material item`}
                  tone="destructive"
                  title="Remove this material item"
                  editable={!isItemsSaving}
                  onClick={() => removeItem(row.id)}
                />
              )
            }
            return null
          }}
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
      <Link href="/components-smoke/templates-list" className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]">
        ← Templates list
      </Link>
      <span className="text-[var(--foreground)]/45">·</span>
      <span className="font-medium text-[var(--foreground)]">Templates record</span>
    </nav>
  )
}
