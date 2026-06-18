"use client"

import { useEffect } from "react"
import {
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RecordSectionSubHeader,
  RecordDeleteDialog,
  buildDeleteConfirmationMessage,
  useRecordDeleteConfirmation,
  type RecordDetailClientScaffoldContext,
  type RecordSectionSubHeaderAction,
} from "@/engines/record-view"
import { AdjustmentRecordFields } from "./adjustment-record-fields"
import type { AdjustmentEditController } from "../../../controllers/record/adjustments/use-adjustment-edit-controller"

export type EmbeddedAdjustmentRecordViewProps = {
  /** The shared adjustment state machine, already opened (create/edit) by the host. */
  controller: AdjustmentEditController
  /** Host record page — its `confirmNavigation` guards the Back action. */
  hostPage: RecordDetailClientScaffoldContext
  /** Flip the host drilldown back to its list face. */
  onBack: () => void
  /** Bridge the controller's dirtiness up so the host section reflects it. */
  onDirtyChange?: (dirty: boolean) => void
  /**
   * When provided, a "Save and split" action saves/creates the adjustment then
   * routes to the split-off inventory create form (seeded with `quantity`). The
   * host owns the navigation so `returnTo` stays correct per surface.
   */
  onSplitAfterSave?: (args: { inventoryId: string; quantity: string }) => void
  /**
   * When provided (edit mode only), an "Add inventory from adjustment" action
   * routes straight to the split-off create form seeded from the saved
   * adjustment — no re-save.
   */
  onAddInventoryFromAdjustment?: (args: { inventoryId: string; quantity: string }) => void
}

/**
 * The adjustment edit/create face rendered **inside** a record-view drilldown.
 * Adjustments only ever appear in a record view as the inventory record view's
 * second section (the work-orders section opens adjustments on the inventory
 * record view, and creates them via its own modal) — so the record-view
 * composition lives here in `modules/inventory`, while `modules/adjustments`
 * stays a pure
 * primitives module (controller + form fields + pickers + columns) with no
 * record-view-engine dependency.
 *
 * Chrome-less adjustment edit/create face: the "Work order" picker stack + the
 * editable form fields, wrapped in a `RecordSectionSubHeader` action row. The
 * host owns the open spec (builds the scope-specific create seed / edit row and
 * calls `controller.openPanel`); this only renders state, bridges dirtiness, and
 * routes Back through the shared host guard.
 */
export function EmbeddedAdjustmentRecordView({
  controller,
  hostPage,
  onBack,
  onDirtyChange,
  onSplitAfterSave,
  onAddInventoryFromAdjustment,
}: EmbeddedAdjustmentRecordViewProps) {
  const { open, form, isDirty, canSave, isSaving, error } = controller

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const isCreate = open?.mode === "create"
  const adjustment = open?.mode === "edit" ? open.adjustment : null
  // The inventory the split-off seeds from: the edited row's, or the create
  // seed's parent inventory.
  const splitSourceInventoryId =
    open?.mode === "edit"
      ? open.adjustment.inventoryId
      : open?.mode === "create"
        ? open.seed.inventoryId ?? null
        : null

  const handleBack = () => hostPage.confirmNavigation(onBack)

  // Delete is confirmed through a dialog that holds "Deleting…" until the row
  // commits, then routes back to the list face (`onBack` clears the URL
  // selection so the drilldown remounts the refreshed list). On error we stay on
  // the edit face — the controller has already surfaced it in the sub-header.
  const del = useRecordDeleteConfirmation(async () => {
    try {
      await controller.deleteAdjustment()
      onBack()
    } catch {
      // Error already surfaced via `controller.error`; keep the user on the row.
    }
  })

  // Delete is available on any saved row (edit mode).
  const showDelete = adjustment != null

  const actions: RecordSectionSubHeaderAction[] = [
    {
      key: "back",
      label: "Show list",
      tone: "neutral",
      onClick: handleBack,
      disabled: isSaving,
    },
    {
      key: "save",
      label: isSaving ? (isCreate ? "Creating…" : "Saving…") : isCreate ? "Create" : "Save",
      tone: "primary",
      onClick: () => controller.save(),
      disabled: !canSave || isSaving,
    },
    // One mode-dependent action: in create mode it saves the adjustment then
    // routes to the seeded inventory create form; in edit mode (row already
    // saved) it routes straight there, no re-save.
    ...(splitSourceInventoryId && (isCreate ? onSplitAfterSave : onAddInventoryFromAdjustment)
      ? [
          {
            key: "add-inventory",
            label: isCreate
              ? "Save and add inventory from adjustment"
              : "Add inventory from adjustment",
            tone: "neutral" as const,
            onClick: isCreate
              ? () =>
                  controller.save({
                    onSaved: () =>
                      onSplitAfterSave?.({
                        inventoryId: splitSourceInventoryId,
                        quantity: form.quantity,
                      }),
                  })
              : () =>
                  onAddInventoryFromAdjustment?.({
                    inventoryId: splitSourceInventoryId,
                    quantity: form.quantity,
                  }),
            disabled: isCreate ? !canSave || isSaving : isSaving,
          },
        ]
      : []),
    {
      key: "discard",
      label: "Discard",
      tone: "neutral",
      onClick: () => controller.discard(),
      disabled: !isDirty || isSaving,
    },
    ...(showDelete
      ? [
          {
            key: "delete",
            label: "Delete",
            tone: "destructive" as const,
            onClick: del.requestDelete,
            disabled: isSaving,
          },
        ]
      : []),
  ]

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
        actions={actions}
      />
      <div className={`px-5 py-5 ${RECORD_SECTION_BODY_SURFACE_CLASS_NAME}`}>
        <AdjustmentRecordFields
          controller={controller}
          mode={isCreate ? "create" : "edit"}
          adjustment={adjustment}
        />
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
