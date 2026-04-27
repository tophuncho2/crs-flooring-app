"use client"

import { useMemo, useState } from "react"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import {
  CheckboxCell,
  CurrencyCell,
  NumberCell,
  RowActionButton,
  SelectCell,
  TextCell,
  TextareaCell,
} from "@/components/cells"
import {
  Grid,
  GridEmpty,
  ScopedRow,
  type GridColumn,
  type GridControlColumn,
  type GridLayout,
  type GridRow,
} from "@/components/grid"
import { ExpandToggle, ExpandableRow } from "@/components/grid/expandable-rows"
import { RichDropdown } from "@/components/dropdowns/rich-dropdown"
import { SegmentedDropdown } from "@/components/dropdowns/segmented-dropdown"
import { ActionsPanel } from "@/components/dropdowns/actions-panel"
import { StatusBadge } from "@/components/badges"
import { SectionHeader } from "@/components/headers"

const MANAGEMENT_COMPANIES = [
  { value: "mc-1", label: "Bluepoint Management" },
  { value: "mc-2", label: "Holcomb Properties" },
  { value: "mc-3", label: "Brookhurst Commercial" },
]

const PROPERTIES = [
  {
    id: "prop-1",
    title: "Mercer Apartments",
    subtitles: ["1240 Mercer Ave · Springfield, IL"],
  },
  {
    id: "prop-2",
    title: "Holcomb Lofts",
    subtitles: ["88 Holcomb St · Springfield, IL"],
  },
  {
    id: "prop-3",
    title: "Patel Row",
    subtitles: ["402 Patel Row · Springfield, IL"],
  },
  {
    id: "prop-4",
    title: "Brookhurst Plaza",
    subtitles: ["3110 Brookhurst Blvd · Springfield, IL"],
  },
]

const TEMPLATES = [
  { value: "tpl-1", label: "TPL-0001 · 1BR/1BA" },
  { value: "tpl-2", label: "TPL-0002 · 2BR/2BA" },
  { value: "tpl-3", label: "TPL-0003 · Studio" },
]

const JOB_TYPES = [
  { value: "jt-1", label: "Make-Ready" },
  { value: "jt-2", label: "Renovation" },
  { value: "jt-3", label: "Premium Turn" },
]

const WAREHOUSES = [
  { value: "wh-1", label: "Darby" },
  { value: "wh-2", label: "Holcomb" },
]

const VACANCY_STATUSES = [
  { value: "VACANT", label: "Vacant" },
  { value: "OCCUPIED", label: "Occupied" },
]

// ---------- Material items fixtures + layout ------------------------------

const CATEGORY_OPTIONS = [
  { id: "cat-vinyl", title: "Vinyl", subtitles: ["Plank · sheet · LVT"] },
  { id: "cat-tile", title: "Tile / LVT", subtitles: ["Porcelain · ceramic · LVT"] },
  { id: "cat-carpet", title: "Carpet", subtitles: ["Berber · plush · frieze"] },
  { id: "cat-hardwood", title: "Hardwood", subtitles: ["Engineered · solid"] },
  { id: "cat-underlayment", title: "Underlayment", subtitles: ["Pad · cork · foam"] },
  { id: "cat-trim", title: "Trim & Accessory", subtitles: ["Quarter-round · transitions"] },
]

type ProductFixture = {
  id: string
  title: string
  subtitles: string[]
  categoryId: string
  /** Coverage rate for cut logs (e.g. sqft/box, sqft/sqyd, ft/pc). */
  coverageRate: number
  /** Display unit for the coverage cut column (suffix). */
  coverageUnit: string
}

const PRODUCT_OPTIONS: ReadonlyArray<ProductFixture> = [
  { id: "prd-1", title: "Vinyl Plank — XL Cyrus Grayton", subtitles: ["SKU 5001 · 28 sqft / box"], categoryId: "cat-vinyl", coverageRate: 28, coverageUnit: "sqft" },
  { id: "prd-2", title: "Vinyl Plank — Coastal Oak", subtitles: ["SKU 5002 · 24 sqft / box"], categoryId: "cat-vinyl", coverageRate: 24, coverageUnit: "sqft" },
  { id: "prd-3", title: "LVT Tile — Slate Grey", subtitles: ["SKU 6010 · 22 sqft / box"], categoryId: "cat-tile", coverageRate: 22, coverageUnit: "sqft" },
  { id: "prd-4", title: "Carpet — Berber Beige", subtitles: ["SKU 7001 · 12 ft wide"], categoryId: "cat-carpet", coverageRate: 9, coverageUnit: "sqft" },
  { id: "prd-5", title: "Hardwood — White Oak Smoked", subtitles: ["SKU 8004 · 5 in plank"], categoryId: "cat-hardwood", coverageRate: 20, coverageUnit: "sqft" },
  { id: "prd-6", title: "Carpet Pad — 8lb rebond", subtitles: ["SKU 7500 · 6 ft wide"], categoryId: "cat-underlayment", coverageRate: 1, coverageUnit: "sqyd" },
  { id: "prd-7", title: "Underlayment — 3mm cork", subtitles: ["SKU 7600 · 4 ft × 50 ft roll"], categoryId: "cat-underlayment", coverageRate: 200, coverageUnit: "sqft" },
  { id: "prd-8", title: "Trim — White 1/4 round", subtitles: ["SKU 9001 · 8 ft pcs"], categoryId: "cat-trim", coverageRate: 8, coverageUnit: "ft" },
]

type MaterialItem = GridRow & {
  categoryId: string | null
  productId: string | null
  quantity: string
  unitPrice: string
  notes: string
}

const INITIAL_MATERIAL_ITEMS: MaterialItem[] = [
  { id: "mi-1", categoryId: "cat-vinyl", productId: "prd-1", quantity: "28", unitPrice: "55.00", notes: "Living room + kitchen" },
  { id: "mi-2", categoryId: "cat-underlayment", productId: "prd-7", quantity: "28", unitPrice: "1.20", notes: "Sound underlay under vinyl plank" },
  { id: "mi-3", categoryId: "cat-carpet", productId: "prd-4", quantity: "32", unitPrice: "11.00", notes: "Both bedrooms" },
  { id: "mi-4", categoryId: "cat-trim", productId: "prd-8", quantity: "120", unitPrice: "0.65", notes: "Quarter round in linear feet" },
]

const MATERIAL_ITEMS_LAYOUT: GridLayout<MaterialItem> = {
  leadingControls: [
    { key: "expand", kind: "expand", width: 40 },
    { key: "select", kind: "selection", width: 40 },
  ],
  dataColumns: [
    { key: "category", label: "Category", minWidth: 200, grow: 0 },
    { key: "product", label: "Product", minWidth: 260, preferredWidth: 320, grow: 1.5 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 110, grow: 0, align: "end" },
    { key: "unitPrice", label: "Unit Price", kind: "currency", minWidth: 120, grow: 0, align: "end" },
    { key: "cost", label: "Cost", kind: "currency", minWidth: 130, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 220, grow: 1 },
  ],
  trailingControls: [{ key: "remove", kind: "actions", width: 72 }],
}

// ---------- Cut logs (child rows nested under each material item) ---------
//
// Cut logs follow the inventory-cut workflow: each row records how much stock
// was cut from the parent material item. Editable: Cut, Waste, Notes.
// Computed (display-only): Before, After, Coverage Cut.
//   - Before  = parent quantity − Σ(cut + waste) of all earlier logs
//   - After   = Before − Cut − Waste
//   - Coverage Cut = Cut × product.coverageRate (e.g. sqft per box)

type CutLog = GridRow & {
  cut: string
  waste: string
  notes: string
}

const INITIAL_CUT_LOGS_BY_ITEM: Record<string, CutLog[]> = {
  "mi-1": [
    { id: "cl-1", cut: "12.0", waste: "0.5", notes: "Living room install" },
    { id: "cl-2", cut: "8.5", waste: "0.5", notes: "Kitchen — partial" },
  ],
  "mi-3": [
    { id: "cl-3", cut: "16.0", waste: "1.0", notes: "Bedroom 1" },
    { id: "cl-4", cut: "14.0", waste: "0.0", notes: "Bedroom 2" },
  ],
}

const CUT_LOG_LAYOUT: GridLayout<CutLog> = {
  dataColumns: [
    { key: "before", label: "Before", kind: "number", minWidth: 100, grow: 0, align: "end" },
    { key: "cut", label: "Cut", kind: "number", minWidth: 110, grow: 0, align: "end" },
    { key: "waste", label: "Waste", kind: "number", minWidth: 110, grow: 0, align: "end" },
    { key: "after", label: "After", kind: "number", minWidth: 100, grow: 0, align: "end" },
    { key: "coverageCut", label: "Coverage Cut", kind: "number", minWidth: 140, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 280, grow: 1 },
  ],
  trailingControls: [{ key: "remove", kind: "actions", width: 56 }],
}

// ---------- Compute helpers -----------------------------------------------

function lineCost(quantity: string, unitPrice: string): string {
  const q = parseFloat(quantity || "0")
  const u = parseFloat(unitPrice || "0")
  if (Number.isNaN(q) || Number.isNaN(u)) return ""
  return (q * u).toFixed(2)
}

function grandCost(items: ReadonlyArray<MaterialItem>): string {
  const total = items.reduce((acc, item) => {
    const line = parseFloat(lineCost(item.quantity, item.unitPrice) || "0")
    return acc + (Number.isNaN(line) ? 0 : line)
  }, 0)
  return total.toFixed(2)
}

function safeNumber(value: string): number {
  const parsed = parseFloat(value || "0")
  return Number.isNaN(parsed) ? 0 : parsed
}

function computeBeforeForLog(itemQuantity: string, logsBefore: ReadonlyArray<CutLog>): string {
  const start = safeNumber(itemQuantity)
  const used = logsBefore.reduce((acc, log) => acc + safeNumber(log.cut) + safeNumber(log.waste), 0)
  return (start - used).toFixed(2)
}

function computeAfter(before: string, cut: string, waste: string): string {
  return (safeNumber(before) - safeNumber(cut) - safeNumber(waste)).toFixed(2)
}

function computeCoverageCut(cut: string, coverageRate: number): string {
  return (safeNumber(cut) * coverageRate).toFixed(2)
}

function getProductFixture(productId: string | null): ProductFixture | null {
  if (!productId) return null
  return PRODUCT_OPTIONS.find((product) => product.id === productId) ?? null
}

// ---------- Page component ------------------------------------------------

export default function WorkOrderCellsSmokePage() {
  // ---------- Primary section state ---------------------------------------
  const [workOrderNumber, setWorkOrderNumber] = useState("WO-1042")
  const [managementCompanyId, setManagementCompanyId] = useState("mc-1")
  const [propertyId, setPropertyId] = useState<string | null>("prop-1")
  const [templateId, setTemplateId] = useState("tpl-2")
  const [jobTypeId, setJobTypeId] = useState("jt-1")
  const [warehouseId, setWarehouseId] = useState("wh-1")
  const [vacancyStatus, setVacancyStatus] = useState<string | null>("VACANT")
  const [isComplete, setIsComplete] = useState(false)
  const [date, setDate] = useState("2026-04-27")
  const [unitNumber, setUnitNumber] = useState("204")
  const [unitType, setUnitType] = useState("2BR/2BA")
  const [address, setAddress] = useState("1240 Mercer Ave · Unit 204")
  const [description, setDescription] = useState("Standard 2BR turn — vinyl plank + carpet bedrooms")
  const [instructions, setInstructions] = useState("Pull existing carpet/pad day 1. Vinyl install day 2. Carpet install day 3.")
  const [propertyInstructions, setPropertyInstructions] = useState("Notify Bluepoint front desk before crew arrival. Use freight elevator only.")
  const [notes, setNotes] = useState("")

  // ---------- Material items section controller (mocked) ------------------
  const [items, setItems] = useState<MaterialItem[]>(INITIAL_MATERIAL_ITEMS)
  const [savedItemsSnapshot, setSavedItemsSnapshot] = useState<MaterialItem[]>(INITIAL_MATERIAL_ITEMS)
  const [isItemsSaving, setIsItemsSaving] = useState(false)
  const [itemsNotice, setItemsNotice] = useState<string | null>(null)
  const [itemsError, setItemsError] = useState<string | null>(null)

  const isItemsDirty = useMemo(
    () => JSON.stringify(items) !== JSON.stringify(savedItemsSnapshot),
    [items, savedItemsSnapshot],
  )

  // ---------- Batch select controller (mocked) ----------------------------
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [isBatchFiring, setIsBatchFiring] = useState(false)

  const savedItemIds = useMemo(
    () => new Set(savedItemsSnapshot.map((item) => item.id)),
    [savedItemsSnapshot],
  )

  const eligibleSelectedIds = useMemo(
    () => Array.from(selectedIds).filter((id) => savedItemIds.has(id)),
    [selectedIds, savedItemIds],
  )

  // ---------- Cut logs (child rows) — mocked ------------------------------
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(() => new Set())
  const [cutLogsByItem, setCutLogsByItem] = useState<Record<string, CutLog[]>>(INITIAL_CUT_LOGS_BY_ITEM)

  function toggleExpanded(itemId: string) {
    setExpandedItemIds((previous) => {
      const next = new Set(previous)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function expandMany(itemIds: string[]) {
    setExpandedItemIds((previous) => {
      const next = new Set(previous)
      for (const id of itemIds) next.add(id)
      return next
    })
  }

  function addCutLog(itemId: string) {
    setCutLogsByItem((previous) => {
      const existing = previous[itemId] ?? []
      return {
        ...previous,
        [itemId]: [
          ...existing,
          { id: `cl-new-${Date.now()}`, cut: "", waste: "", notes: "" },
        ],
      }
    })
  }

  function updateCutLog(itemId: string, logId: string, patch: Partial<CutLog>) {
    setCutLogsByItem((previous) => {
      const existing = previous[itemId] ?? []
      return {
        ...previous,
        [itemId]: existing.map((log) => (log.id === logId ? { ...log, ...patch } : log)),
      }
    })
  }

  function removeCutLog(itemId: string, logId: string) {
    setCutLogsByItem((previous) => {
      const existing = previous[itemId] ?? []
      const next = existing.filter((log) => log.id !== logId)
      if (next.length === 0) {
        const { [itemId]: _removed, ...rest } = previous
        return rest
      }
      return { ...previous, [itemId]: next }
    })
  }

  // ---------- Material item handlers --------------------------------------
  function clearSelection() {
    setSelectedIds(new Set())
  }

  function toggleSelected(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function updateItem(id: string, patch: Partial<MaterialItem>) {
    setItemsNotice(null)
    setItemsError(null)
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function addItem() {
    setItemsNotice(null)
    setItemsError(null)
    setItems((previous) => [
      ...previous,
      {
        id: `mi-new-${Date.now()}`,
        categoryId: null,
        productId: null,
        quantity: "",
        unitPrice: "",
        notes: "",
      },
    ])
  }

  function removeItem(id: string) {
    setItemsNotice(null)
    setItemsError(null)
    setItems((previous) => previous.filter((item) => item.id !== id))
    setSelectedIds((previous) => {
      if (!previous.has(id)) return previous
      const next = new Set(previous)
      next.delete(id)
      return next
    })
  }

  function discardItems() {
    setItems(savedItemsSnapshot)
    setItemsNotice(null)
    setItemsError(null)
    clearSelection()
  }

  function saveItems() {
    setIsItemsSaving(true)
    setItemsNotice(null)
    setItemsError(null)
    setTimeout(() => {
      setSavedItemsSnapshot(items)
      setIsItemsSaving(false)
      setItemsNotice("Material items saved")
    }, 350)
  }

  function fireBatchDelete() {
    if (eligibleSelectedIds.length === 0) return
    setIsBatchFiring(true)
    setItemsError(null)
    setTimeout(() => {
      const idsToDelete = new Set(eligibleSelectedIds)
      setItems((previous) => previous.filter((item) => !idsToDelete.has(item.id)))
      setSavedItemsSnapshot((previous) => previous.filter((item) => !idsToDelete.has(item.id)))
      clearSelection()
      setIsBatchFiring(false)
      setItemsNotice(`Deleted ${idsToDelete.size} item${idsToDelete.size === 1 ? "" : "s"}`)
    }, 300)
  }

  function fireAssignCuts() {
    if (eligibleSelectedIds.length === 0) return
    const targetIds = [...eligibleSelectedIds]
    expandMany(targetIds)
    for (const id of targetIds) {
      addCutLog(id)
    }
    clearSelection()
    setItemsNotice(
      `Drafted a cut log for ${targetIds.length} item${targetIds.length === 1 ? "" : "s"} — review the new rows below.`,
    )
  }

  const itemsBusy = isItemsSaving || isBatchFiring
  const noEligibleSelection = eligibleSelectedIds.length === 0

  // ---------- Material cell + control renderers ---------------------------
  function renderMaterialCell(column: GridColumn<MaterialItem>, row: MaterialItem) {
    const editable = !itemsBusy
    switch (column.key) {
      case "category":
        return (
          <RichDropdown
            disabled={!editable}
            value={row.categoryId}
            onChange={(next) =>
              updateItem(row.id, {
                categoryId: next,
                productId:
                  next && row.productId
                    ? PRODUCT_OPTIONS.find((product) => product.id === row.productId)?.categoryId === next
                      ? row.productId
                      : null
                    : row.productId,
              })
            }
            options={CATEGORY_OPTIONS}
            placeholder="All categories"
            searchPlaceholder="Search categories…"
            clearLabel="All categories"
            ariaLabel="Category filter"
          />
        )
      case "product": {
        const visibleProducts = row.categoryId
          ? PRODUCT_OPTIONS.filter(
              (product) => product.categoryId === row.categoryId || product.id === row.productId,
            )
          : PRODUCT_OPTIONS
        return (
          <RichDropdown
            disabled={!editable}
            value={row.productId}
            onChange={(next) => updateItem(row.id, { productId: next })}
            options={visibleProducts.map((product) => ({
              id: product.id,
              title: product.title,
              subtitles: product.subtitles,
            }))}
            placeholder="Select product"
            searchPlaceholder="Search products…"
            ariaLabel="Product"
          />
        )
      }
      case "quantity":
        return (
          <NumberCell
            editable={editable}
            value={row.quantity}
            onChange={(next) => updateItem(row.id, { quantity: next })}
            ariaLabel="Quantity"
          />
        )
      case "unitPrice":
        return (
          <CurrencyCell
            editable={editable}
            value={row.unitPrice}
            onChange={(next) => updateItem(row.id, { unitPrice: next })}
            ariaLabel="Unit price"
          />
        )
      case "cost":
        return (
          <CurrencyCell
            editable={false}
            value={lineCost(row.quantity, row.unitPrice)}
            ariaLabel="Line cost"
          />
        )
      case "notes":
        return (
          <TextCell
            editable={editable}
            value={row.notes}
            onChange={(next) => updateItem(row.id, { notes: next })}
            ariaLabel="Notes"
          />
        )
      default:
        return null
    }
  }

  function renderMaterialControl(control: GridControlColumn, row: MaterialItem) {
    if (control.kind === "expand") {
      const isExpanded = expandedItemIds.has(row.id)
      const cutLogCount = cutLogsByItem[row.id]?.length ?? 0
      return (
        <ExpandToggle
          expanded={isExpanded}
          onToggle={() => toggleExpanded(row.id)}
          ariaLabel={
            isExpanded
              ? `Hide cut logs for material item (${cutLogCount})`
              : `Show cut logs for material item (${cutLogCount})`
          }
        />
      )
    }
    if (control.kind === "selection") {
      const isSavedRow = savedItemIds.has(row.id)
      return (
        <CheckboxCell
          editable={isSavedRow && !itemsBusy}
          value={selectedIds.has(row.id)}
          onChange={() => toggleSelected(row.id)}
          ariaLabel="Select material item"
        />
      )
    }
    if (control.kind === "actions") {
      return (
        <RowActionButton
          label="✕"
          ariaLabel="Remove material item"
          tone="destructive"
          title="Remove this material item"
          editable={!itemsBusy}
          onClick={() => removeItem(row.id)}
        />
      )
    }
    return null
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-6 p-8 pb-48">
      {/* ============== Primary section ============== */}
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Work Order Cells"
          subtitle="Cell-box rehearsal for the work-order primary section"
        />
        <div className="px-4 py-4">
          <FieldSection>
            {/* Row 1 */}
            <CellAt col={1} row={1} colSpan={2}>
              <FormField label="Work Order #">
                <TextCell editable value={workOrderNumber} onChange={setWorkOrderNumber} />
              </FormField>
            </CellAt>
            <CellAt col={3} row={1} colSpan={2}>
              <FormField label="Date">
                <TextCell editable value={date} onChange={setDate} placeholder="YYYY-MM-DD" />
              </FormField>
            </CellAt>
            <CellAt col={5} row={1} colSpan={2}>
              <FormField label="Unit #">
                <TextCell editable value={unitNumber} onChange={setUnitNumber} />
              </FormField>
            </CellAt>
            <CellAt col={7} row={1} colSpan={2}>
              <FormField label="Unit Type">
                <TextCell editable value={unitType} onChange={setUnitType} />
              </FormField>
            </CellAt>

            {/* Row 2 */}
            <CellAt col={1} row={2} colSpan={2}>
              <FormField label="Management Company">
                <SelectCell
                  editable
                  value={managementCompanyId}
                  onChange={setManagementCompanyId}
                  options={MANAGEMENT_COMPANIES}
                  placeholder="Select management company"
                />
              </FormField>
            </CellAt>
            <CellAt col={3} row={2} colSpan={2}>
              <FormField label="Property">
                <RichDropdown
                  value={propertyId}
                  onChange={setPropertyId}
                  options={PROPERTIES}
                  placeholder="Select property"
                  searchPlaceholder="Search properties…"
                  ariaLabel="Property"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} row={2} colSpan={2}>
              <FormField label="Template">
                <SelectCell
                  editable
                  value={templateId}
                  onChange={setTemplateId}
                  options={TEMPLATES}
                  placeholder="Select template"
                />
              </FormField>
            </CellAt>
            <CellAt col={7} row={2} colSpan={2}>
              <FormField label="Warehouse">
                <SelectCell
                  editable
                  value={warehouseId}
                  onChange={setWarehouseId}
                  options={WAREHOUSES}
                  placeholder="Select warehouse"
                />
              </FormField>
            </CellAt>

            {/* Row 3 */}
            <CellAt col={1} row={3} colSpan={2}>
              <FormField label="Job Type">
                <SelectCell
                  editable
                  value={jobTypeId}
                  onChange={setJobTypeId}
                  options={JOB_TYPES}
                  placeholder="Select job type"
                />
              </FormField>
            </CellAt>
            <CellAt col={3} row={3} colSpan={2}>
              <FormField label="Vacancy Status">
                <SegmentedDropdown
                  value={vacancyStatus}
                  onChange={setVacancyStatus}
                  options={VACANCY_STATUSES}
                  allowClear
                  clearLabel="None"
                  ariaLabel="Vacancy status"
                />
              </FormField>
            </CellAt>
            <CellAt col={5} row={3} colSpan={2}>
              <FormField label="Is Complete">
                <CheckboxCell
                  editable
                  value={isComplete}
                  onChange={setIsComplete}
                  ariaLabel="Is complete"
                />
              </FormField>
            </CellAt>

            {/* Row 4 — Address (full width) */}
            <CellAt col={1} row={4} colSpan={8}>
              <FormField label="Address">
                <TextCell editable value={address} onChange={setAddress} />
              </FormField>
            </CellAt>

            {/* Row 5 — Description */}
            <CellAt col={1} row={5} colSpan={8}>
              <FormField label="Description">
                <TextareaCell editable value={description} onChange={setDescription} rows={2} />
              </FormField>
            </CellAt>

            {/* Row 6 — Instructions */}
            <CellAt col={1} row={6} colSpan={8}>
              <FormField label="Instructions">
                <TextareaCell editable value={instructions} onChange={setInstructions} rows={3} />
              </FormField>
            </CellAt>

            {/* Row 7 — Property Instructions */}
            <CellAt col={1} row={7} colSpan={8}>
              <FormField label="Property Instructions">
                <TextareaCell
                  editable
                  value={propertyInstructions}
                  onChange={setPropertyInstructions}
                  rows={3}
                />
              </FormField>
            </CellAt>

            {/* Row 8 — Notes */}
            <CellAt col={1} row={8} colSpan={8}>
              <FormField label="Notes">
                <TextareaCell editable value={notes} onChange={setNotes} rows={3} />
              </FormField>
            </CellAt>
          </FieldSection>
        </div>
      </div>

      {/* ============== Material Items section ============== */}
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        {/* Custom header so the ActionsPanel sits inline with the other action
            buttons. Mirrors the visual structure of `<ActionHeader>` but lets
            us swap the bulk-action button for the panel trigger. */}
        <div className="flex flex-col gap-3 border-b border-[var(--panel-border)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="truncate text-base font-semibold text-[var(--foreground)]">Material Items</div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={isItemsDirty ? "warning" : "default"}>
                {isItemsDirty ? "Unsaved changes" : "Saved"}
              </StatusBadge>
            </div>
            <div className="text-sm text-[var(--foreground)]/75">
              {items.length} item{items.length === 1 ? "" : "s"} · grand cost{" "}
              <span className="font-medium tabular-nums">${grandCost(items)}</span>
              {selectedIds.size > 0 ? (
                <>
                  {" · "}
                  <span className="text-sky-700">
                    {selectedIds.size} selected ({eligibleSelectedIds.length} eligible)
                  </span>
                </>
              ) : null}
            </div>
            {itemsNotice ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
                {itemsNotice}
              </div>
            ) : null}
            {itemsError ? (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
                {itemsError}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addItem}
              disabled={itemsBusy}
              className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add Material Item
            </button>
            <button
              type="button"
              onClick={discardItems}
              disabled={!isItemsDirty || itemsBusy}
              className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={saveItems}
              disabled={!isItemsDirty || itemsBusy}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isItemsSaving ? "Saving Items..." : "Save Items"}
            </button>
            <ActionsPanel
              triggerLabel="Bulk Actions"
              triggerKind="primary"
              panelTitle={
                noEligibleSelection
                  ? "Select rows to enable actions"
                  : `Acting on ${eligibleSelectedIds.length} item${eligibleSelectedIds.length === 1 ? "" : "s"}`
              }
              disabled={itemsBusy}
              ariaLabel="Bulk actions for selected material items"
              actions={[
                {
                  key: "assign-cuts",
                  label: "Assign Cuts",
                  description:
                    eligibleSelectedIds.length > 0
                      ? `Draft a new cut log on each of the ${eligibleSelectedIds.length} selected item${eligibleSelectedIds.length === 1 ? "" : "s"}.`
                      : "Drafts a new cut log on each selected item.",
                  onClick: fireAssignCuts,
                  disabled: noEligibleSelection || itemsBusy,
                },
                {
                  key: "delete-selected",
                  label: isBatchFiring ? "Deleting..." : "Delete Selected",
                  description: "Permanently remove the selected items.",
                  onClick: fireBatchDelete,
                  disabled: noEligibleSelection || itemsBusy,
                  destructive: true,
                  group: "danger",
                },
              ]}
            />
          </div>
        </div>

        <Grid<MaterialItem>
          rows={items}
          layout={MATERIAL_ITEMS_LAYOUT}
          empty={<GridEmpty>No material items yet.</GridEmpty>}
          renderRow={(row) => {
            const isExpanded = expandedItemIds.has(row.id)
            const itemCutLogs = cutLogsByItem[row.id] ?? []
            const product = getProductFixture(row.productId)
            const coverageRate = product?.coverageRate ?? 0
            const coverageUnit = product?.coverageUnit ?? ""

            return (
              <ExpandableRow<MaterialItem, CutLog>
                parentRow={row}
                parentLayout={MATERIAL_ITEMS_LAYOUT}
                expanded={isExpanded}
                renderParentCell={renderMaterialCell}
                renderParentControl={renderMaterialControl}
                childGroupLabel="Cut Logs"
                childCount={itemCutLogs.length}
                childLayout={CUT_LOG_LAYOUT}
                accentTone="sky"
                emptyState={
                  <>
                    <span className="text-[var(--foreground)]/60">
                      No cut logs for this material item yet.
                    </span>
                    <span className="text-xs text-[var(--foreground)]/45">
                      Use <span className="font-medium text-[var(--foreground)]/65">+ Add Cut Log</span> below to record the first cut.
                    </span>
                  </>
                }
                footer={
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-[var(--foreground)]/55">
                      {coverageRate > 0
                        ? `Coverage rate: ${coverageRate} ${coverageUnit} per unit`
                        : "Set a product to compute coverage cuts."}
                    </span>
                    <button
                      type="button"
                      onClick={() => addCutLog(row.id)}
                      disabled={itemsBusy}
                      className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Add Cut Log
                    </button>
                  </div>
                }
              >
                {isExpanded
                  ? itemCutLogs.map((log, logIndex) => {
                      const before = computeBeforeForLog(row.quantity, itemCutLogs.slice(0, logIndex))
                      const after = computeAfter(before, log.cut, log.waste)
                      const coverageCutValue = computeCoverageCut(log.cut, coverageRate)
                      return (
                        <ScopedRow<CutLog>
                          key={log.id}
                          row={log}
                          layout={CUT_LOG_LAYOUT}
                          tone="default"
                          renderCell={(column, l) => {
                            const editable = !itemsBusy
                            switch (column.key) {
                              case "before":
                                return (
                                  <span className="tabular-nums text-[var(--foreground)]/70">{before}</span>
                                )
                              case "cut":
                                return (
                                  <NumberCell
                                    editable={editable}
                                    value={l.cut}
                                    onChange={(next) => updateCutLog(row.id, l.id, { cut: next })}
                                    placeholder="0.00"
                                    ariaLabel="Cut amount"
                                  />
                                )
                              case "waste":
                                return (
                                  <NumberCell
                                    editable={editable}
                                    value={l.waste}
                                    onChange={(next) => updateCutLog(row.id, l.id, { waste: next })}
                                    placeholder="0.00"
                                    ariaLabel="Waste amount"
                                  />
                                )
                              case "after":
                                return (
                                  <span className="tabular-nums text-[var(--foreground)]/70">{after}</span>
                                )
                              case "coverageCut":
                                return (
                                  <span className="tabular-nums text-[var(--foreground)]/70">
                                    {coverageCutValue}
                                    {coverageUnit ? (
                                      <span className="ml-1 text-[10px] uppercase tracking-[0.06em] text-[var(--foreground)]/45">
                                        {coverageUnit}
                                      </span>
                                    ) : null}
                                  </span>
                                )
                              case "notes":
                                return (
                                  <TextCell
                                    editable={editable}
                                    value={l.notes}
                                    onChange={(next) => updateCutLog(row.id, l.id, { notes: next })}
                                    placeholder="Cut notes…"
                                    ariaLabel="Cut log notes"
                                  />
                                )
                              default:
                                return null
                            }
                          }}
                          renderControl={(control, l) => {
                            if (control.kind === "actions") {
                              return (
                                <RowActionButton
                                  label="✕"
                                  ariaLabel="Remove cut log"
                                  tone="destructive"
                                  title="Remove this cut log"
                                  editable={!itemsBusy}
                                  onClick={() => removeCutLog(row.id, l.id)}
                                />
                              )
                            }
                            return null
                          }}
                        />
                      )
                    })
                  : null}
              </ExpandableRow>
            )
          }}
        />
      </div>
    </div>
  )
}
