"use client"

import {
  adjustmentSign,
  formatAdjustmentTransition,
  INVENTORY_ADJUSTMENT_NOTES_MAX,
  isAdjustmentPendingEditable,
} from "@builders/domain"
import { AdjustmentStatusBadge } from "@/components/badges/adjustment-status-badge"
import { StatusBadge } from "@/components/badges/status-badge"
import { TextCell, ToggleCell, UnitCell } from "@/components/cells"
import { SegmentedDropdown } from "@/engines/picker"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import { SectionCard, type SectionCardTone } from "@/components/headers"
import { CellAt } from "@/components/layout-grid/cell-at"
import { formatAdjustmentTimestamp } from "@/modules/adjustments/components/row/format-adjustment-timestamp"
import type {
  AdjustmentEditPanelController,
  AdjustmentPanelRow,
} from "@/modules/adjustments/controllers/adjustment-side-panel"

const EMPTY_CELL = "—"

const LABEL_CLASS = "text-[10px] uppercase tracking-wide text-[var(--foreground)]/55"

/** Card accent carries the row's lifecycle: pending=amber, queued=blue, final=emerald. */
function cardToneForStatus(status: string): SectionCardTone {
  if (status === "FINAL") return "emerald"
  if (status === "QUEUED") return "blue"
  return "amber"
}

export type AdjustmentEditFormFieldsProps = {
  mode: "create" | "edit"
  adjustment: AdjustmentPanelRow | null
  controller: AdjustmentEditPanelController
}

const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "DEDUCTION", label: "Deduction" },
  { value: "INCREASE", label: "Increase" },
] as const

/**
 * The form body of the adjustment edit panel, rendered as a single bordered
 * {@link SectionCard}. The picker stack (Work order / Material item / Warehouse
 * / Inventory / Location) lives in the panel's sticky header
 * (`AdjustmentPickerStack`), so this body holds only the adjustment's own facts.
 *
 * Create mode: a neutral card — type selector, quantity, notes, and a waste
 * lever in the footer.
 * Edit mode: a status-toned card whose header carries the product name + type /
 * status pills; the body pairs quantity + coverage, then the before→after
 * transition, then notes, then created / updated; the footer carries the final
 * sequence and the waste lever. Inputs lock once the row leaves the
 * PENDING-editable state.
 */
export function AdjustmentEditFormFields({
  mode,
  adjustment,
  controller,
}: AdjustmentEditFormFieldsProps) {
  const { form, local, isSaving } = controller

  // Stock-unit source: edit → the row's frozen snapshot; create → the picked
  // inventory's snapshot kept in `local` (seeded for the locked hub case).
  const stockUnit = adjustment?.stockUnitAbbrev ?? local.pickedInventoryStockUnitAbbrev
  const coverageUnit = adjustment?.itemCoverageUnitAbbrev ?? ""

  // Locked once the row leaves the PENDING-editable state. Mirrors the server
  // guard so finalized rows can't accept input — the PATCH would 409 anyway.
  const isReadOnly = mode === "edit" && adjustment != null && !isAdjustmentPendingEditable(adjustment)
  const fieldsEditable = !isSaving && !isReadOnly

  const wasteToggle = (
    <span className="flex items-center gap-2">
      <span className={LABEL_CLASS}>Waste</span>
      <ToggleCell
        editable={fieldsEditable}
        value={form.isWaste}
        onChange={(next) => controller.setField("isWaste", next)}
        ariaLabel="Waste flag"
      />
    </span>
  )

  if (mode === "create" || !adjustment) {
    return (
      <SectionCard
        title="New adjustment"
        tone="neutral"
        footer={<div className="flex items-center justify-end">{wasteToggle}</div>}
      >
        <FieldSection gap="0.75rem">
          <CellAt col={1} colSpan={8}>
            <FormField label="Type" required>
              <SegmentedDropdown
                value={form.adjustmentType}
                onChange={(next: string | null) => {
                  if (next === "INCREASE" || next === "DEDUCTION") {
                    controller.setField("adjustmentType", next)
                  }
                }}
                options={ADJUSTMENT_TYPE_OPTIONS}
                ariaLabel="Adjustment type"
                disabled={isSaving}
              />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={4}>
            <FormField label="Quantity" required>
              <UnitCell
                editable={fieldsEditable}
                value={form.quantity}
                onChange={(next) => controller.setField("quantity", next)}
                unit={stockUnit}
                placeholder="0"
                ariaLabel="Adjustment quantity"
              />
            </FormField>
          </CellAt>
          <CellAt col={1} colSpan={8}>
            <FormField
              label="Notes"
              currentLength={fieldsEditable ? form.notes.length : undefined}
              maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
            >
              <TextCell
                editable={fieldsEditable}
                value={form.notes}
                onChange={(next) => controller.setField("notes", next)}
                placeholder="Notes"
                ariaLabel="Adjustment notes"
                maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
              />
            </FormField>
          </CellAt>
        </FieldSection>
      </SectionCard>
    )
  }

  const transition = formatAdjustmentTransition(adjustment.before, adjustment.after, stockUnit) ?? EMPTY_CELL
  const coverageValue = adjustment.coverage
    ? `${adjustmentSign(adjustment.adjustmentType)}${adjustment.coverage}`
    : ""

  return (
    <SectionCard
      title={adjustment.productName || EMPTY_CELL}
      tone={cardToneForStatus(adjustment.status)}
      headerRight={
        <>
          <StatusBadge tone={adjustment.adjustmentType === "INCREASE" ? "success" : "error"}>
            {adjustment.adjustmentType === "INCREASE" ? "Increase" : "Deduction"}
          </StatusBadge>
          <AdjustmentStatusBadge status={adjustment.status} />
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className={LABEL_CLASS}>Final sequence</span>
            <span className="text-sm tabular-nums text-[var(--foreground)]/85">
              {adjustment.finalSequence != null ? adjustment.finalSequence : EMPTY_CELL}
            </span>
          </span>
          {wasteToggle}
        </div>
      }
    >
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={3}>
          <FormField label="Quantity" required>
            <UnitCell
              editable={fieldsEditable}
              value={form.quantity}
              onChange={(next) => controller.setField("quantity", next)}
              unit={stockUnit}
              placeholder="0"
              ariaLabel="Adjustment quantity"
            />
          </FormField>
        </CellAt>
        <CellAt col={4} colSpan={2}>
          <FormField label="Coverage">
            <StaticFieldValue>
              {coverageValue ? `${coverageValue} ${coverageUnit}`.trim() : EMPTY_CELL}
            </StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={6} colSpan={3}>
          <FormField label="Adjustment">
            <StaticFieldValue className="tabular-nums">{transition}</StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={8}>
          <FormField
            label="Notes"
            currentLength={fieldsEditable ? form.notes.length : undefined}
            maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
          >
            <TextCell
              editable={fieldsEditable}
              value={form.notes}
              onChange={(next) => controller.setField("notes", next)}
              placeholder="Notes"
              ariaLabel="Adjustment notes"
              maxLength={INVENTORY_ADJUSTMENT_NOTES_MAX}
            />
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <FormField label="Created">
            <StaticFieldValue>{formatAdjustmentTimestamp(adjustment.createdAt)}</StaticFieldValue>
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Updated">
            <StaticFieldValue>{formatAdjustmentTimestamp(adjustment.updatedAt)}</StaticFieldValue>
          </FormField>
        </CellAt>
      </FieldSection>
    </SectionCard>
  )
}
