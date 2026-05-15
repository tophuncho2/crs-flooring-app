"use client"

import type { FlooringStagedRowStatus } from "@builders/domain"
import { StatusBadge } from "@/components/badges"
import type { BadgeTone } from "@/components/badges/contracts/badge-tone"
import { TextCell, UnitCell } from "@/components/cells"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid/cell-at"
import type { StagedInvRowEditPanelController } from "@/modules/imports/controllers/record/staged-inventory/use-staged-inv-row-edit-panel"

function statusTone(status: FlooringStagedRowStatus): BadgeTone {
  switch (status) {
    case "QUEUED":
      return "processing"
    case "IMPORTED":
      return "success"
    default:
      return "default"
  }
}

function statusLabel(status: FlooringStagedRowStatus): string {
  switch (status) {
    case "QUEUED":
      return "Queued"
    case "IMPORTED":
      return "Imported"
    default:
      return "Draft"
  }
}

/**
 * Resolve display values that depend on which mode the panel is in:
 *   - create: read filter-row context from the open spec
 *   - edit:   read parent product label + status from the row, stock-unit
 *             from the filter-row that owns it
 */
function resolveContext(
  controller: StagedInvRowEditPanelController,
): {
  productLabel: string
  stockUnitAbbrev: string
  status: FlooringStagedRowStatus
  isEditable: boolean
} {
  const { open } = controller
  if (!open) {
    return {
      productLabel: "—",
      stockUnitAbbrev: "",
      status: "DRAFT",
      isEditable: false,
    }
  }
  if (open.mode === "create") {
    return {
      productLabel: open.filterRowProductName,
      stockUnitAbbrev: open.filterRowStockUnitAbbrev,
      status: "DRAFT",
      isEditable: true,
    }
  }
  return {
    productLabel: open.row.productName,
    stockUnitAbbrev: open.row.stockUnitAbbrev || open.filterRow.stockUnitAbbrev,
    status: open.row.status,
    isEditable: open.row.status === "DRAFT",
  }
}

export function StagedInvRowEditFormFields({
  controller,
}: {
  controller: StagedInvRowEditPanelController
}) {
  const { form, setField, isSaving } = controller
  const ctx = resolveContext(controller)
  const editable = ctx.isEditable && !isSaving

  return (
    <div className="flex flex-col gap-4 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)]/40 p-3">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          Context
        </h3>
        <FieldSection gap="0.75rem">
          <CellAt col={1} colSpan={4}>
            <FormField label="Status">
              <div className="flex items-center">
                <StatusBadge tone={statusTone(ctx.status)}>{statusLabel(ctx.status)}</StatusBadge>
              </div>
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={8}>
            <FormField label="Filter row product">
              <TextCell editable={false} value={ctx.productLabel || "—"} ariaLabel="Filter row product" />
            </FormField>
          </CellAt>
        </FieldSection>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          Identification
        </h3>
        <FieldSection gap="0.75rem">
          <CellAt col={1} colSpan={4}>
            <FormField label="Roll #">
              <TextCell
                editable={editable}
                value={form.rollNumber}
                onChange={(value) => setField("rollNumber", value)}
                ariaLabel="Roll number"
              />
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={4}>
            <FormField label="Dye lot">
              <TextCell
                editable={editable}
                value={form.dyeLot}
                onChange={(value) => setField("dyeLot", value)}
                ariaLabel="Dye lot"
              />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={8}>
            <FormField label="Note">
              <TextCell
                editable={editable}
                value={form.note}
                onChange={(value) => setField("note", value)}
                ariaLabel="Note"
              />
            </FormField>
          </CellAt>
        </FieldSection>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/65">
          Inventory &amp; location
        </h3>
        <FieldSection gap="0.75rem">
          <CellAt col={1} colSpan={4}>
            <FormField label="Starting stock" required>
              <UnitCell
                editable={editable}
                value={form.startingStock}
                onChange={(value) => setField("startingStock", value)}
                unit={ctx.stockUnitAbbrev || "unit"}
                ariaLabel="Starting stock"
              />
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={4}>
            <FormField label="Location">
              <TextCell
                editable={editable}
                value={form.location}
                onChange={(value) => setField("location", value)}
                ariaLabel="Location"
              />
            </FormField>
          </CellAt>
        </FieldSection>
      </section>
    </div>
  )
}
