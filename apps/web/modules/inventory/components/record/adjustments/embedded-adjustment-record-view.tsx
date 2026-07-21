"use client"

import { useEffect, type ReactNode } from "react"
import { EllipsisVertical, List } from "lucide-react"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import {
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RecordFooterNeutralButton,
  RecordSectionSubHeader,
  RecordDeleteDialog,
  buildDeleteConfirmationMessage,
  useRecordDeleteConfirmation,
  type RecordDetailClientScaffoldContext,
  type RecordSectionSubHeaderAction,
} from "@/engines/record-view"
import { renderAdjustmentRowActions } from "@/modules/adjustments"
import { AdjustmentRecordFields } from "./adjustment-record-fields"
import type { AdjustmentEditController } from "../../../controllers/record/adjustments/use-adjustment-edit-controller"

export type EmbeddedAdjustmentRecordViewProps = {
  /** The shared adjustment state machine, already opened in edit mode by the host. */
  controller: AdjustmentEditController
  /** Host record page — its `confirmNavigation` guards the Back action. */
  hostPage: RecordDetailClientScaffoldContext
  /** Flip the host drilldown back to its list face. */
  onBack: () => void
  /** Bridge the controller's dirtiness up so the host section reflects it. */
  onDirtyChange?: (dirty: boolean) => void
  /**
   * Node rendered inline to the left of the Save / Discard / Delete buttons in
   * the sub-header (the per-parent adjustment stepper). Mirrors the work-order
   * material-items section, which feeds its mode stepper into the same
   * `actionsLeading` slot rather than stacking it above.
   */
  actionsLeading?: ReactNode
  /**
   * When provided, an "Add inventory from adjustment" action routes straight to
   * the split-off create form seeded from the saved adjustment — no re-save.
   */
  onAddInventoryFromAdjustment?: (args: { inventoryId: string; quantity: string }) => void
  /**
   * When provided, a "Create return" action opens the shared return modal seeded
   * off the saved adjustment's work-order link — the edit-face equivalent of the
   * list row's ⋮ "Create return". The host owns the modal + inventory-row seed.
   */
  onCreateReturn?: (args: { workOrderId: string | null; workOrderLabel: string | null }) => void
  /**
   * When provided, a "Duplicate adjustment" action opens the create modal seeded
   * from this row — the same handler the list row's ⋮ "Duplicate" uses.
   */
  onDuplicate?: (row: EnrichedInventoryAdjustmentRow) => void
}

/**
 * The adjustment **edit** face rendered **inside** a record-view drilldown.
 * Adjustments only ever appear in a record view as the inventory record view's
 * second section — so the record-view composition lives here in
 * `modules/inventory`, while `modules/adjustments` stays a pure primitives module
 * (controller + form fields + pickers + columns) with no record-view-engine
 * dependency. **Create is a modal** (`InventoryAdjustmentCreateModal`); this face
 * is edit-only.
 *
 * Chrome-less edit face: the "Work order" picker stack + the editable form fields,
 * wrapped in a `RecordSectionSubHeader` action row. The host owns the open spec
 * (resolves the edit row and calls `openEdit`); this only renders state, bridges
 * dirtiness, and routes Back through the shared host guard.
 */
export function EmbeddedAdjustmentRecordView({
  controller,
  hostPage,
  onBack,
  onDirtyChange,
  onAddInventoryFromAdjustment,
  onCreateReturn,
  onDuplicate,
  actionsLeading,
}: EmbeddedAdjustmentRecordViewProps) {
  const { open, form, isDirty, canSave, isSaving, error } = controller

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const adjustment = open?.mode === "edit" ? open.adjustment : null

  const handleBack = () => hostPage.confirmNavigation(onBack)

  // Delete is confirmed through a dialog that holds "Deleting…" until the row
  // commits, then routes back to the list face (`onBack` clears the URL selection
  // so the drilldown remounts the refreshed list). On error we stay on the edit
  // face — the controller has already surfaced it in the sub-header.
  const del = useRecordDeleteConfirmation(async () => {
    try {
      await controller.deleteAdjustment()
      onBack()
    } catch {
      // Error already surfaced via `controller.error`; keep the user on the row.
    }
  })

  const actions: RecordSectionSubHeaderAction[] = [
    {
      key: "save",
      label: isSaving ? "Saving…" : "Save",
      tone: "primary",
      onClick: () => controller.save(),
      disabled: !canSave || isSaving,
    },
    {
      key: "discard",
      label: "Discard",
      tone: "neutral",
      onClick: () => controller.discard(),
      disabled: !isDirty || isSaving,
    },
  ]

  // The shared row ⋮ menu, mounted at the right of the sub-header (actionsTrailing).
  // Split-off / return / duplicate / delete — the same options the list rows carry,
  // wired to the host callbacks. Delete is the bottom item (canonical order) and is
  // confirmed through the same dialog below (`del`), so it persists past the menu
  // closing. Coerce the edit row to the Enriched shape the renderer expects
  // (`workOrderNumber`/`warehouseName` aren't read by these items).
  const optionsMenu = adjustment
    ? renderAdjustmentRowActions(
        {
          ...adjustment,
          workOrderNumber: adjustment.workOrderNumber ?? null,
          warehouseName: adjustment.warehouseName ?? "",
        },
        {
          onSplitOff: (row) =>
            onAddInventoryFromAdjustment?.({ inventoryId: row.inventoryId, quantity: form.quantity }),
          onCreateReturn: (row) =>
            onCreateReturn?.({ workOrderId: row.workOrderId, workOrderLabel: row.workOrderNumber }),
          onDuplicate: (row) => onDuplicate?.(row),
          // Delete the currently-open edit row via the shared confirm dialog. The
          // controller deletes the open adjustment (not the row arg), so the arg
          // is unused here.
          onDelete: () => del.requestDelete(),
        },
        isSaving,
        // Sub-header wants a labeled "Options" button (matching Save/Discard),
        // not the list rows' icon-only ⋮.
        ({ toggle, disabled }) => (
          <RecordFooterNeutralButton onClick={toggle} disabled={disabled}>
            <EllipsisVertical size={16} aria-hidden="true" />
            Options
          </RecordFooterNeutralButton>
        ),
      )
    : null

  if (!open) {
    return <p className="px-4 py-6 text-sm text-[var(--foreground)]/60">Loading adjustment…</p>
  }

  // Mirror the primary section's chrome (RecordFieldSection, showHeader=false):
  // the sub-header sits flush above a body that carries the shared section
  // surface, so the adjustment section reads as one panel like the inventory
  // section above — rather than groups floating on white.
  return (
    <div>
      <RecordSectionSubHeader
        canManage={false}
        isDirty={isDirty}
        isSaving={isSaving}
        hasConflict={false}
        error={error}
        actionsLeading={
          <>
            {/* Back to the list face — icon-only, leftmost (left of the adj#
                stepper). Same dirty-guarded handler + disable-while-saving as the
                old "Show list" text button. */}
            <RecordFooterNeutralButton
              onClick={handleBack}
              disabled={isSaving}
              aria-label="Show list"
              title="Show list"
            >
              <List size={16} aria-hidden="true" />
            </RecordFooterNeutralButton>
            {actionsLeading}
          </>
        }
        actions={actions}
        actionsTrailing={optionsMenu}
      />
      <div className={`px-5 py-5 ${RECORD_SECTION_BODY_SURFACE_CLASS_NAME}`}>
        <AdjustmentRecordFields controller={controller} mode="edit" adjustment={adjustment} />
      </div>
      <RecordDeleteDialog
        open={del.isOpen}
        isDeleting={del.isDeleting}
        title="Delete adjustment?"
        message={buildDeleteConfirmationMessage("adjustment")}
        onConfirm={del.confirmDelete}
        onCancel={del.cancelDelete}
      />
    </div>
  )
}
