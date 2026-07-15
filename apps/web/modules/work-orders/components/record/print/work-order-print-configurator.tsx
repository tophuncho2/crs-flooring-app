"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  buildWorkOrderCsv,
  buildWorkOrderPrintConfig,
  buildWorkOrderPrintHtml,
  WORK_ORDER_DOCUMENT_LABELS,
  WORK_ORDER_TOP_FIELD_KEYS,
  WORK_ORDER_TOP_FIELD_LABELS,
  type WorkOrderFileGenerationInput,
  type WorkOrderPrintConfig,
  type WorkOrderPrintPreset,
} from "@builders/domain"
import { RecordStepper } from "@/engines/record-view"

/**
 * On-demand work-order print configurator. Seeds a {@link WorkOrderPrintConfig}
 * from the entry button's `preset`, renders a screen-only checkbox panel (top
 * values · bottom mode · columns · per-row), and re-runs the pure domain builder
 * on every toggle to drive a live preview. The panel is `print:hidden`, so the
 * Print button prints only the preview. Replaces the old auto-print flow.
 */
const CHECKBOX_CLASS =
  "h-4 w-4 cursor-pointer rounded border-neutral-300 text-sky-600 focus:ring-1 focus:ring-sky-500/40"

const ADJUSTMENT_COLUMN_FIELDS = [
  { key: "dyeLot", label: "Dyelot" },
  { key: "rollNumber", label: "Roll#" },
  { key: "converted", label: "Converted" },
  { key: "adjustment", label: "Adjustment" },
  { key: "location", label: "Location" },
  { key: "area", label: "Area" },
] as const

export function WorkOrderPrintConfigurator({
  input,
  logoUrl,
  preset,
  previousWorkOrderId,
  nextWorkOrderId,
}: {
  input: WorkOrderFileGenerationInput
  logoUrl: string | null
  preset: WorkOrderPrintPreset
  previousWorkOrderId: string | null
  nextWorkOrderId: string | null
}) {
  const router = useRouter()

  // Stepping is a full route change to the neighbor's print URL — the page
  // re-renders server-side (re-auth included) and reseeds the config from the
  // new work order's rows. Prefetch present neighbors so the swap is near-instant.
  const stepTo = (id: string) => router.push(`/print/work-orders/${id}`)

  useEffect(() => {
    if (previousWorkOrderId) router.prefetch(`/print/work-orders/${previousWorkOrderId}`)
    if (nextWorkOrderId) router.prefetch(`/print/work-orders/${nextWorkOrderId}`)
  }, [previousWorkOrderId, nextWorkOrderId, router])

  const allAdjustmentIds = useMemo(
    () => input.adjustmentGroups.flatMap((group) => group.adjustments.map((adj) => adj.id)),
    [input.adjustmentGroups],
  )
  const allMaterialIds = useMemo(
    () => input.materialItemGroups.flatMap((group) => group.materialItems.map((item) => item.id)),
    [input.materialItemGroups],
  )

  // Seed from the preset, then start with every row selected so the preview
  // matches the named document the user clicked into.
  const [config, setConfig] = useState<WorkOrderPrintConfig>(() => ({
    ...buildWorkOrderPrintConfig(preset),
    selectedAdjustmentIds: allAdjustmentIds,
    selectedMaterialIds: allMaterialIds,
  }))

  const selectedAdjustmentIds = useMemo(
    () => new Set(config.selectedAdjustmentIds ?? []),
    [config.selectedAdjustmentIds],
  )
  const selectedMaterialIds = useMemo(
    () => new Set(config.selectedMaterialIds ?? []),
    [config.selectedMaterialIds],
  )

  const html = useMemo(
    () => buildWorkOrderPrintHtml(input, config, { logoUrl }),
    [input, config, logoUrl],
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

  // Export the CURRENT preview as CSV — same `input` + `config` the print builder
  // reads, so the file matches what's on screen (checked top fields, the active
  // bottom section's columns, and the selected rows). Pure client-side blob
  // download; no route, no fetch.
  const handleExportCsv = useCallback(() => {
    const csv = buildWorkOrderCsv(input, config)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `work-order-${input.workOrderNumber}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [input, config])

  const toggleTopField = (key: (typeof WORK_ORDER_TOP_FIELD_KEYS)[number]) =>
    setConfig((current) => ({
      ...current,
      topFields: { ...current.topFields, [key]: !current.topFields[key] },
    }))

  // Each bottom section (adjustments / requested material) toggles independently
  // — both may be on. Whatever is on renders on every output (print + CSV).
  const toggleSection = (key: keyof WorkOrderPrintConfig["sections"]) =>
    setConfig((current) => ({
      ...current,
      sections: { ...current.sections, [key]: !current.sections[key] },
    }))

  // Document-type switch is label-only — it sets the centered top tag and leaves
  // the user's section/columns/row selections untouched.
  const setDocumentLabel = (documentLabel: string) =>
    setConfig((current) => ({ ...current, documentLabel }))

  const toggleAdjustmentColumn = (key: (typeof ADJUSTMENT_COLUMN_FIELDS)[number]["key"]) =>
    setConfig((current) => ({
      ...current,
      adjustmentColumns: {
        ...current.adjustmentColumns,
        [key]: !current.adjustmentColumns[key],
      },
    }))

  const toggleMaterialNotes = () =>
    setConfig((current) => ({
      ...current,
      materialColumns: { notes: !current.materialColumns.notes },
    }))

  const toggleId = (id: string, field: "selectedAdjustmentIds" | "selectedMaterialIds") =>
    setConfig((current) => {
      const next = new Set(current[field] ?? [])
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { ...current, [field]: [...next] }
    })

  const setAllRows = (
    field: "selectedAdjustmentIds" | "selectedMaterialIds",
    ids: ReadonlyArray<string>,
    selectAll: boolean,
  ) => setConfig((current) => ({ ...current, [field]: selectAll ? [...ids] : [] }))

  return (
    <main className="mx-auto flex max-w-6xl gap-6 bg-white px-6 py-8 text-black print:block print:max-w-none print:gap-0 print:p-0">
      <aside className="w-72 shrink-0 space-y-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm print:hidden">
        <h2 className="text-base font-semibold">Export options</h2>

        {/* Walk the global work-order-number line without leaving the print
            view. Bare stepper (no portal / dirty guard) — nothing here is
            editable. A null edge disables that arrow. */}
        <RecordStepper
          label={input.workOrderNumber}
          onPrevious={previousWorkOrderId ? () => stepTo(previousWorkOrderId) : null}
          onNext={nextWorkOrderId ? () => stepTo(nextWorkOrderId) : null}
          previousAriaLabel="Previous work order"
          nextAriaLabel="Next work order"
        />

        {/* Output actions, stacked under the stepper. Both play the SAME
            checkbox selections below — one drives the browser print, the other
            the CSV download. */}
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

        <PanelSection title="Document">
          <div className="flex flex-col gap-1 rounded border border-neutral-200 p-0.5">
            {WORK_ORDER_DOCUMENT_LABELS.map((label) => (
              <ModeButton
                key={label}
                active={config.documentLabel === label}
                onClick={() => setDocumentLabel(label)}
              >
                {label}
              </ModeButton>
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-400">Sets the centered title on the document.</p>
        </PanelSection>

        <PanelSection title="Top section">
          {WORK_ORDER_TOP_FIELD_KEYS.map((key) => (
            <CheckRow
              key={key}
              checked={config.topFields[key]}
              onChange={() => toggleTopField(key)}
              label={WORK_ORDER_TOP_FIELD_LABELS[key]}
            />
          ))}
        </PanelSection>

        {/* Two independent bottom sections. Each has its own show toggle,
            columns, and row picker; both can be on at once and each renders on
            every output (print + CSV). */}
        <PanelSection title="Adjustments">
          <CheckRow
            checked={config.sections.adjustments}
            onChange={() => toggleSection("adjustments")}
            label="Include section"
          />
          {config.sections.adjustments ? (
            <>
              <p className="mt-2 mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Columns
              </p>
              {ADJUSTMENT_COLUMN_FIELDS.map((column) => (
                <CheckRow
                  key={column.key}
                  checked={config.adjustmentColumns[column.key]}
                  onChange={() => toggleAdjustmentColumn(column.key)}
                  label={column.label}
                />
              ))}
              <p className="mt-1 text-xs text-neutral-400">Product &amp; Quantity always show.</p>

              <RowPicker
                title="Rows"
                groups={input.adjustmentGroups.map((group) => ({
                  productName: group.productName,
                  rows: group.adjustments.map((adj) => ({
                    id: adj.id,
                    label: rowLabel(adj.quantity, adj.unitAbbrev, adj.rollNumber || adj.dyeLot),
                  })),
                }))}
                selectedIds={selectedAdjustmentIds}
                onToggle={(id) => toggleId(id, "selectedAdjustmentIds")}
                onAll={(selectAll) => setAllRows("selectedAdjustmentIds", allAdjustmentIds, selectAll)}
                emptyLabel="No adjustments on this work order."
              />
            </>
          ) : null}
        </PanelSection>

        <PanelSection title="Requested Material">
          <CheckRow
            checked={config.sections.material}
            onChange={() => toggleSection("material")}
            label="Include section"
          />
          {config.sections.material ? (
            <>
              <p className="mt-2 mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Columns
              </p>
              <CheckRow
                checked={config.materialColumns.notes}
                onChange={toggleMaterialNotes}
                label="Notes"
              />
              <p className="mt-1 text-xs text-neutral-400">Product &amp; Qty / Unit always show.</p>

              <RowPicker
                title="Rows"
                groups={input.materialItemGroups.map((group) => ({
                  productName: group.productName,
                  rows: group.materialItems.map((item) => ({
                    id: item.id,
                    label: rowLabel(item.quantity, item.unitAbbrev, item.notes),
                  })),
                }))}
                selectedIds={selectedMaterialIds}
                onToggle={(id) => toggleId(id, "selectedMaterialIds")}
                onAll={(selectAll) => setAllRows("selectedMaterialIds", allMaterialIds, selectAll)}
                emptyLabel="No requested material on this work order."
              />
            </>
          ) : null}
        </PanelSection>
      </aside>

      <div className="min-w-0 flex-1">
        <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </main>
  )
}

function rowLabel(quantity: string, unitAbbrev: string, detail: string): string {
  const qty = unitAbbrev ? `${quantity} ${unitAbbrev}` : quantity
  return detail ? `${qty} · ${detail}` : qty
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
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

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 rounded px-2 py-1 text-xs font-medium",
        active ? "bg-sky-600 text-white" : "text-neutral-600 hover:bg-neutral-100",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function RowPicker({
  title,
  groups,
  selectedIds,
  onToggle,
  onAll,
  emptyLabel,
}: {
  title: string
  groups: ReadonlyArray<{
    productName: string
    rows: ReadonlyArray<{ id: string; label: string }>
  }>
  selectedIds: ReadonlySet<string>
  onToggle: (id: string) => void
  onAll: (selectAll: boolean) => void
  emptyLabel: string
}) {
  const hasRows = groups.some((group) => group.rows.length > 0)
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
        <div className="max-h-64 space-y-2 overflow-auto pr-1">
          {groups
            .filter((group) => group.rows.length > 0)
            .map((group) => (
              // Key on the first row's (globally-unique) id, NOT productName — a
              // product can now appear as multiple groups (one per unit, UoM
              // epic), so productName is no longer unique across groups.
              <div key={group.rows[0].id}>
                <p className="truncate text-xs font-medium text-neutral-600">{group.productName}</p>
                {group.rows.map((row) => (
                  <CheckRow
                    key={row.id}
                    checked={selectedIds.has(row.id)}
                    onChange={() => onToggle(row.id)}
                    label={row.label}
                  />
                ))}
              </div>
            ))}
        </div>
      ) : (
        <p className="text-xs text-neutral-400">{emptyLabel}</p>
      )}
    </div>
  )
}
