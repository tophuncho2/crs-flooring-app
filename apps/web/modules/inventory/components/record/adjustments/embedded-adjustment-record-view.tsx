"use client"

import { useEffect } from "react"
import { isAdjustmentPendingEditable } from "@builders/domain"
import {
  RecordSectionSubHeader,
  type RecordDetailClientScaffoldContext,
  type RecordSectionSubHeaderAction,
} from "@/engines/record-view"
import {
  AdjustmentEditFormFields,
  AdjustmentPickerStack,
  AdjustmentPickerTakeoverBody,
  type AdjustmentEditPanelController,
} from "@/modules/adjustments"

export type EmbeddedAdjustmentRecordViewProps = {
  /** The shared adjustment state machine, already opened (create/edit) by the host. */
  controller: AdjustmentEditPanelController
  /** Host record page — its `confirmNavigation` guards the Back action. */
  hostPage: RecordDetailClientScaffoldContext
  /** Flip the host drilldown back to its list face. */
  onBack: () => void
  /** Bridge the controller's dirtiness up so the host section reflects it. */
  onDirtyChange?: (dirty: boolean) => void
  /** Navigate to the linked work order from the picker stack (optional). */
  onOpenWorkOrder?: (workOrderId: string) => void
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
 * Chrome-less analog of `AdjustmentEditPanel`: same controller-driven body
 * (picker stack / active picker takeover / editable form fields), wrapped in a
 * `RecordSectionSubHeader` action row instead of a `HubSidePanelShell`. The host
 * owns the open spec (builds the scope-specific create seed / edit row and calls
 * `controller.openPanel`); this only renders state, bridges dirtiness, and
 * routes Back through the shared host guard.
 */
export function EmbeddedAdjustmentRecordView({
  controller,
  hostPage,
  onBack,
  onDirtyChange,
  onOpenWorkOrder,
}: EmbeddedAdjustmentRecordViewProps) {
  const { open, pickerKind, isDirty, canSave, isSaving, error } = controller

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const isCreate = open?.mode === "create"
  const adjustment = open?.mode === "edit" ? open.adjustment : null
  const isPickerActive = pickerKind !== null

  const handleBack = () => hostPage.confirmNavigation(onBack)

  // Finalize only while the row is still pending-editable; delete only in edit.
  const showFinalize = adjustment != null && isAdjustmentPendingEditable(adjustment)
  const showDelete = adjustment != null

  const actions: RecordSectionSubHeaderAction[] = [
    {
      key: "back",
      label: "Back",
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
    ...(showFinalize
      ? [
          {
            key: "finalize",
            label: "Finalize",
            tone: "neutral" as const,
            onClick: () => controller.finalize(),
            disabled: isSaving || isDirty,
          },
        ]
      : []),
    ...(showDelete
      ? [
          {
            key: "delete",
            label: "Delete",
            tone: "destructive" as const,
            onClick: () => controller.deleteAdjustment(),
            disabled: isSaving,
          },
        ]
      : []),
  ]

  if (!open) {
    return <p className="px-4 py-6 text-sm text-[var(--foreground)]/60">Loading adjustment…</p>
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <RecordSectionSubHeader
        canManage={false}
        isDirty={isDirty}
        isSaving={isSaving}
        hasConflict={false}
        error={error}
        actions={actions}
      />
      {isPickerActive ? (
        <AdjustmentPickerTakeoverBody controller={controller} />
      ) : (
        <div className="flex flex-col gap-3">
          <AdjustmentPickerStack controller={controller} onOpenWorkOrder={onOpenWorkOrder} />
          <AdjustmentEditFormFields
            mode={isCreate ? "create" : "edit"}
            adjustment={adjustment}
            controller={controller}
          />
        </div>
      )}
    </div>
  )
}
