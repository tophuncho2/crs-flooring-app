"use client"

import type { CutLogRow } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { CheckboxCell, NumberCell, TextCell } from "@/components/cells"
import { FieldSection, FormField } from "@/components/fields"
import { CellAt } from "@/components/layout-grid/cell-at"
import { formatCutLogTimestamp } from "@/components/features/cut-log-row/format-cut-log-timestamp"
import type {
  CutLogEditForm,
  EligibleInventoryRow,
} from "@/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel"
import { InventoryRichDropdown } from "./inventory-rich-dropdown"

export type CutLogEditFormFieldsProps = {
  mode: "create" | "edit"
  cutLog: CutLogRow | null
  form: CutLogEditForm
  eligibleInventory: ReadonlyArray<EligibleInventoryRow>
  isLoadingInventory: boolean
  isSaving: boolean
  onFieldChange: <K extends keyof CutLogEditForm>(field: K, value: CutLogEditForm[K]) => void
}

/**
 * The form body of the cut-log edit panel. Uses `FieldSection` (8-col
 * invisible grid) for layout. In edit mode the inventory selector becomes a
 * static display (saved cuts have immutable inventory). In create mode the
 * inventory selector is a `RichDropdown` with section + location filters.
 */
export function CutLogEditFormFields({
  mode,
  cutLog,
  form,
  eligibleInventory,
  isLoadingInventory,
  isSaving,
  onFieldChange,
}: CutLogEditFormFieldsProps) {
  const inventoryDisplay = (() => {
    if (!cutLog) return "—"
    const inv = eligibleInventory.find((i) => i.id === cutLog.inventoryId)
    if (inv) {
      return [inv.inventoryNumber, inv.locationCode].filter(Boolean).join(" · ")
    }
    return cutLog.inventoryId
  })()

  const stockUnit = cutLog?.stockUnitAbbrev ?? ""
  const coverageUnit = cutLog?.itemCoverageUnitAbbrev ?? ""

  return (
    <FieldSection gap="0.75rem">
      {/* Row 1 — status + cut number (edit mode only) */}
      {cutLog ? (
        <>
          <CellAt col={1} colSpan={3}>
            <FormField label="Status">
              <div className="flex items-center">
                <CutLogStatusBadge status={cutLog.status} />
              </div>
            </FormField>
          </CellAt>
          <CellAt col={4} colSpan={5}>
            <FormField label="Cut number">
              <TextCell editable={false} value={cutLog.cutLogNumber} ariaLabel="Cut number" />
            </FormField>
          </CellAt>
        </>
      ) : null}

      {/* Row 2 — cut + coverage */}
      <CellAt col={1} colSpan={4}>
        <FormField label={stockUnit ? `Cut (${stockUnit})` : "Cut"} required>
          <NumberCell
            editable={!isSaving}
            value={form.cut}
            onChange={(next) => onFieldChange("cut", next)}
            placeholder="0"
            ariaLabel="Cut amount"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label={coverageUnit ? `Coverage (${coverageUnit})` : "Coverage"}>
          <TextCell editable={false} value={cutLog?.coverageCut ?? "—"} ariaLabel="Coverage" />
        </FormField>
      </CellAt>

      {/* Row 3 — before / after (read-only, worker-stamped) */}
      <CellAt col={1} colSpan={4}>
        <FormField label="Before">
          <TextCell editable={false} value={cutLog?.before ?? "—"} ariaLabel="Before" />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="After">
          <TextCell editable={false} value={cutLog?.after ?? "—"} ariaLabel="After" />
        </FormField>
      </CellAt>

      {/* Row 4 — waste + final sequence (below before/after) */}
      <CellAt col={1} colSpan={4}>
        <FormField label="Waste">
          <CheckboxCell
            editable={!isSaving}
            value={form.isWaste}
            onChange={(next) => onFieldChange("isWaste", next)}
            ariaLabel="Waste flag"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Final sequence">
          <TextCell
            editable={false}
            value={cutLog?.finalCutSequence != null ? String(cutLog.finalCutSequence) : "—"}
            ariaLabel="Final sequence"
          />
        </FormField>
      </CellAt>

      {/* Row 5 — notes */}
      <CellAt col={1} colSpan={8}>
        <FormField label="Notes">
          <TextCell
            editable={!isSaving}
            value={form.notes}
            onChange={(next) => onFieldChange("notes", next)}
            placeholder="Notes"
            ariaLabel="Cut log notes"
          />
        </FormField>
      </CellAt>

      {/* Row 5 — created / updated (read-only, edit mode only) */}
      {cutLog ? (
        <>
          <CellAt col={1} colSpan={4}>
            <FormField label="Created">
              <TextCell
                editable={false}
                value={formatCutLogTimestamp(cutLog.createdAt)}
                ariaLabel="Created at"
              />
            </FormField>
          </CellAt>
          <CellAt col={5} colSpan={4}>
            <FormField label="Updated">
              <TextCell
                editable={false}
                value={formatCutLogTimestamp(cutLog.updatedAt)}
                ariaLabel="Updated at"
              />
            </FormField>
          </CellAt>
        </>
      ) : null}

      {/* Row 6 — inventory pinned to the bottom (selector in create, read-only in edit) */}
      <CellAt col={1} colSpan={8}>
        {mode === "create" ? (
          <FormField label="Inventory" required>
            <InventoryRichDropdown
              value={form.inventoryId || null}
              onChange={(next) => onFieldChange("inventoryId", next ?? "")}
              inventories={eligibleInventory}
              disabled={isSaving}
              isLoading={isLoadingInventory}
              ariaLabel="Cut log inventory"
            />
          </FormField>
        ) : (
          <FormField label="Inventory">
            <TextCell editable={false} value={inventoryDisplay} ariaLabel="Inventory" />
          </FormField>
        )}
      </CellAt>
    </FieldSection>
  )
}
