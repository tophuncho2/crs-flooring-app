"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  buildInventoryCsv,
  buildInventoryPrintConfig,
  buildInventoryPrintHtml,
  INVENTORY_DOCUMENT_LABEL,
  INVENTORY_PRINT_ADJUSTMENT_COLUMNS,
  INVENTORY_PRINT_CELL_FIELDS,
  INVENTORY_PRINT_FIELD_COLUMNS,
  type InventoryDetail,
  type InventoryPrintConfig,
} from "@builders/domain"
import { RecordStepper } from "@/engines/record-view"

/**
 * On-demand inventory print + CSV configurator. Seeds an {@link InventoryPrintConfig},
 * renders a screen-only checkbox panel, and re-runs the pure domain builders on every
 * toggle to drive a live preview. The panel is `print:hidden`, so the Print button
 * prints only the preview.
 *
 * Two outputs, shaped to their medium:
 *   - PRINT — the roll TAG: a big Roll# heading, the four print-cell checkboxes
 *     (Style / Color / Starting Stock / Created Date), and a blank hand-write grid.
 *     Always fits a page.
 *   - CSV — the record AND the adjustments ledger (adjustment column checkboxes + row
 *     picker). Adjustments are CSV-only (they never fit a printed sheet), flagged as such.
 */
const CHECKBOX_CLASS =
  "h-4 w-4 cursor-pointer rounded border-neutral-300 text-sky-600 focus:ring-1 focus:ring-sky-500/40"

export function InventoryPrintConfigurator({
  inventory,
  logoUrl,
  previousInventoryId,
  nextInventoryId,
}: {
  inventory: InventoryDetail
  logoUrl: string | null
  previousInventoryId: string | null
  nextInventoryId: string | null
}) {
  const router = useRouter()

  // Stepping is a full route change to the neighbor's print URL — the page
  // re-renders server-side (re-auth included) and reseeds the config from the
  // new inventory's rows. Prefetch present neighbors so the swap is near-instant.
  const stepTo = (id: string) => router.push(`/print/inventory/${id}`)

  useEffect(() => {
    if (previousInventoryId) router.prefetch(`/print/inventory/${previousInventoryId}`)
    if (nextInventoryId) router.prefetch(`/print/inventory/${nextInventoryId}`)
  }, [previousInventoryId, nextInventoryId, router])

  const allAdjustmentIds = useMemo(
    () => inventory.inventoryAdjustments.map((adjustment) => adjustment.id),
    [inventory.inventoryAdjustments],
  )

  // Seed the defaults, then start with every adjustment row selected so the CSV
  // carries the full ledger until the user narrows it.
  const [config, setConfig] = useState<InventoryPrintConfig>(() => ({
    ...buildInventoryPrintConfig(),
    selectedAdjustmentIds: allAdjustmentIds,
  }))

  const selectedAdjustmentIds = useMemo(
    () => new Set(config.selectedAdjustmentIds ?? []),
    [config.selectedAdjustmentIds],
  )

  const html = useMemo(
    () => buildInventoryPrintHtml(inventory, config, { logoUrl }),
    [inventory, config, logoUrl],
  )

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = "CRS Floor Covering"
    return () => {
      document.title = previousTitle
    }
  }, [])

  const handlePrint = useCallback(async () => {
    // Wait for any injected images (the presigned brand logo) to load so the
    // dialog never races a blank logo; a short timeout keeps a slow/broken asset
    // from blocking print indefinitely.
    const container = containerRef.current
    if (container) {
      const pending = Array.from(container.querySelectorAll("img"))
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true })
              img.addEventListener("error", () => resolve(), { once: true })
            }),
        )
      if (pending.length > 0) {
        const timeout = new Promise<void>((resolve) => {
          setTimeout(resolve, 1500)
        })
        await Promise.race([Promise.all(pending), timeout])
      }
    }
    window.print()
  }, [])

  // Export as CSV — same `inventory` + `config` the preview reads. Unlike the
  // print, the CSV also carries the adjustments ledger (checked columns × selected
  // rows). Pure client-side blob download.
  const handleExportCsv = useCallback(() => {
    const csv = buildInventoryCsv(inventory, config)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `inventory-${inventory.inventoryNumber}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [inventory, config])

  const toggleInventoryColumn = (key: string) =>
    setConfig((current) => ({
      ...current,
      inventoryColumns: { ...current.inventoryColumns, [key]: !current.inventoryColumns[key] },
    }))

  const toggleAdjustmentColumn = (key: string) =>
    setConfig((current) => ({
      ...current,
      adjustmentColumns: { ...current.adjustmentColumns, [key]: !current.adjustmentColumns[key] },
    }))

  const toggleAdjustmentRow = (id: string) =>
    setConfig((current) => {
      const next = new Set(current.selectedAdjustmentIds ?? [])
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { ...current, selectedAdjustmentIds: [...next] }
    })

  const setAllAdjustmentRows = (selectAll: boolean) =>
    setConfig((current) => ({
      ...current,
      selectedAdjustmentIds: selectAll ? [...allAdjustmentIds] : [],
    }))

  return (
    <main className="mx-auto flex max-w-6xl gap-6 bg-white px-6 py-8 text-black print:block print:max-w-none print:gap-0 print:p-0">
      <aside className="w-72 shrink-0 space-y-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm print:hidden">
        <h2 className="text-base font-semibold">Export options</h2>

        {/* Walk the global inventory-number line without leaving the print view.
            Bare stepper (no portal / dirty guard) — nothing here is editable. A
            null edge disables that arrow. */}
        <RecordStepper
          label={inventory.inventoryNumber}
          onPrevious={previousInventoryId ? () => stepTo(previousInventoryId) : null}
          onNext={nextInventoryId ? () => stepTo(nextInventoryId) : null}
          previousAriaLabel="Previous inventory"
          nextAriaLabel="Next inventory"
        />

        {/* Output actions. Print emits the inventory record sheet; CSV emits the
            record + adjustments ledger. Both read the checkbox selections below. */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="w-full rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void handlePrint()}
            className="w-full rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Print
          </button>
        </div>

        {/* Inventory has a single printed document — the roll tag — so the
            document type is a static label, not a selector. */}
        <PanelSection title="Document">
          <div className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700">
            {INVENTORY_DOCUMENT_LABEL}
          </div>
          <p className="mt-1 text-xs text-neutral-400">The printed sheet is the roll tag.</p>
        </PanelSection>

        {/* The four cells shown on the printed roll tag (under the big Roll#). */}
        <PanelSection title="Print fields">
          <p className="-mt-1 mb-1 text-xs text-neutral-400">Cells shown on the roll tag.</p>
          {INVENTORY_PRINT_CELL_FIELDS.map((column) => (
            <CheckRow
              key={column.key}
              checked={config.inventoryColumns[column.key] ?? false}
              onChange={() => toggleInventoryColumn(column.key)}
              label={column.label}
            />
          ))}
        </PanelSection>

        {/* Full record field list — drives the CSV export only (the print tag shows
            just the four Print fields above), flagged by the badge. */}
        <PanelSection title="Inventory fields" badge={<CsvOnlyBadge />}>
          {INVENTORY_PRINT_FIELD_COLUMNS.map((column) => (
            <CheckRow
              key={column.key}
              checked={config.inventoryColumns[column.key] ?? false}
              onChange={() => toggleInventoryColumn(column.key)}
              label={column.label}
            />
          ))}
        </PanelSection>

        {/* Adjustments never print (they overflow any sheet) — these selections
            shape the CSV export only, flagged by the badge. */}
        <PanelSection title="Adjustments" badge={<CsvOnlyBadge />}>
          <p className="-mt-1 mb-1 text-xs text-neutral-400">
            Not printed — included in the CSV export only.
          </p>
          <p className="mt-1 mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Columns
          </p>
          {INVENTORY_PRINT_ADJUSTMENT_COLUMNS.map((column) => (
            <CheckRow
              key={column.key}
              checked={config.adjustmentColumns[column.key] ?? false}
              onChange={() => toggleAdjustmentColumn(column.key)}
              label={column.label}
            />
          ))}

          <RowPicker
            title="Rows"
            rows={inventory.inventoryAdjustments.map((adjustment) => ({
              id: adjustment.id,
              label: rowLabel(adjustment.adjustmentNumber, adjustment.quantity, adjustment.unitAbbrev),
            }))}
            selectedIds={selectedAdjustmentIds}
            onToggle={toggleAdjustmentRow}
            onAll={setAllAdjustmentRows}
            emptyLabel="No adjustments on this inventory."
          />
        </PanelSection>
      </aside>

      <div className="min-w-0 flex-1">
        <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </main>
  )
}

function rowLabel(adjustmentNumber: string, quantity: string, unitAbbrev: string | null): string {
  const qty = unitAbbrev ? `${quantity} ${unitAbbrev}` : quantity
  return `${adjustmentNumber} · ${qty}`
}

function CsvOnlyBadge() {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
      CSV only
    </span>
  )
}

function PanelSection({
  title,
  badge,
  children,
}: {
  title: string
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={onChange} className={CHECKBOX_CLASS} />
      <span className="text-neutral-700">{label}</span>
    </label>
  )
}

function RowPicker({
  title,
  rows,
  selectedIds,
  onToggle,
  onAll,
  emptyLabel,
}: {
  title: string
  rows: ReadonlyArray<{ id: string; label: string }>
  selectedIds: ReadonlySet<string>
  onToggle: (id: string) => void
  onAll: (selectAll: boolean) => void
  emptyLabel: string
}) {
  const hasRows = rows.length > 0
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</p>
        {hasRows ? (
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => onAll(true)} className="text-sky-600 hover:underline">
              All
            </button>
            <button type="button" onClick={() => onAll(false)} className="text-sky-600 hover:underline">
              None
            </button>
          </div>
        ) : null}
      </div>
      {hasRows ? (
        <div className="max-h-64 space-y-1.5 overflow-auto pr-1">
          {rows.map((row) => (
            <CheckRow
              key={row.id}
              checked={selectedIds.has(row.id)}
              onChange={() => onToggle(row.id)}
              label={row.label}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-neutral-400">{emptyLabel}</p>
      )}
    </div>
  )
}
