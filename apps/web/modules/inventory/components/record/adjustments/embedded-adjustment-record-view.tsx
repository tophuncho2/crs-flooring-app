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
import { AdjustmentEditFormFields } from "./adjustment-edit-form-fields"
import { AdjustmentPickerStack } from "./adjustment-picker-stack"
import { InventoryFieldGrid } from "../fields"
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
}

/**
 * The adjustment edit/create face rendered **inside** a record-view drilldown.
 * Adjustments only ever appear in a record view as the inventory record view's
 * second section (the work-orders material-items section reuses this same
 * component for its inline per-WOMI editing) — so the record-view composition
 * lives here in `modules/inventory`, while `modules/adjustments` stays a pure
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
}: EmbeddedAdjustmentRecordViewProps) {
  const { open, isDirty, canSave, isSaving, error } = controller

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const isCreate = open?.mode === "create"
  const adjustment = open?.mode === "edit" ? open.adjustment : null

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
        <InventoryFieldGrid>
          <AdjustmentPickerStack controller={controller} />
          <AdjustmentEditFormFields
            mode={isCreate ? "create" : "edit"}
            adjustment={adjustment}
            controller={controller}
          />
        </InventoryFieldGrid>
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
