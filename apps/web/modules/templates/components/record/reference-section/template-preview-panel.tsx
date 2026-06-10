"use client"

import type { ReactNode } from "react"
import { ActionHeader } from "@/engines/common"
import { Grid, GridEmpty, type GridLayout } from "@/engines/record-view"
import type { TemplateDetail, TemplateMaterialItemRow } from "@builders/domain"

const PANEL_CLASS = "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

const MATERIAL_ITEMS_LAYOUT: GridLayout<TemplateMaterialItemRow> = {
  dataColumns: [
    { key: "product", label: "Product", minWidth: 260, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 120, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
  ],
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/55">
        {label}
      </p>
      <p className="truncate text-sm text-[var(--foreground)]">{value || "—"}</p>
    </div>
  )
}

/**
 * Read-only preview of a template shown beneath the shared templates reference
 * header (consumed by both the MC and property record views). Mirrors the
 * (editable) template record panel's two sections — Template Details + Material
 * Items — as static, non-editable surfaces. The "Open template" action hands off
 * to the full editable hub. No editing happens here; switching the previewed
 * template discards nothing.
 */
export function TemplatePreviewPanel({
  template,
  onOpen,
}: {
  template: TemplateDetail
  onOpen: () => void
}) {
  const address = [
    template.propertyStreetAddress,
    [template.propertyCity, template.propertyState].filter(Boolean).join(", "),
    template.propertyPostalCode,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex flex-col gap-4">
      <div className={PANEL_CLASS}>
        <ActionHeader
          title="Template Details"
          actions={[
            { key: "open", label: "Open template ↗", onClick: onOpen, kind: "secondary" },
          ]}
        />
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <Field label="Job Type" value={template.jobTypeName} />
          <Field label="Warehouse" value={template.warehouseName} />
          <Field label="Unit Type" value={template.unitType} />
          <Field label="Description" value={template.description} />
          <Field label="Property" value={template.propertyName} />
          <Field label="Property Address" value={address} />
          <Field label="Property Instructions" value={template.propertyInstructions} />
          <Field label="Installer Instructions" value={template.installerInstructions} />
          <Field label="Internal Notes" value={template.internalNotes} />
        </div>
      </div>

      <div className={PANEL_CLASS}>
        <ActionHeader
          title="Material Items"
          summary={
            <span>
              {template.items.length} item{template.items.length === 1 ? "" : "s"}
            </span>
          }
        />
        <Grid<TemplateMaterialItemRow>
          rows={template.items}
          layout={MATERIAL_ITEMS_LAYOUT}
          empty={<GridEmpty>No material items.</GridEmpty>}
          renderCell={(column, item) => {
            switch (column.key) {
              case "product":
                return (
                  <span className="truncate text-sm text-[var(--foreground)]">
                    {item.productName || "—"}
                  </span>
                )
              case "quantity":
                return (
                  <span className="text-sm text-[var(--foreground)]">
                    {item.quantity || "—"}
                    {item.sendUnitAbbrev ? (
                      <span className="text-[var(--foreground)]/60"> {item.sendUnitAbbrev}</span>
                    ) : null}
                  </span>
                )
              case "notes":
                return (
                  <span className="truncate text-sm text-[var(--foreground)]/80">
                    {item.notes || "—"}
                  </span>
                )
              default:
                return null
            }
          }}
        />
      </div>
    </div>
  )
}
