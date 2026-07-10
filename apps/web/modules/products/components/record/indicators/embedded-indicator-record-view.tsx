"use client"

import { useEffect, type ReactNode } from "react"
import {
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RecordSectionSubHeader,
  RecordDeleteDialog,
  buildDeleteConfirmationMessage,
  useRecordDeleteConfirmation,
  type RecordDetailClientScaffoldContext,
  type RecordSectionSubHeaderAction,
} from "@/engines/record-view"
import { IndicatorRecordFields } from "./indicator-record-fields"
import type { IndicatorEditController } from "@/modules/products/controllers/record/indicators/use-indicator-edit-controller"

export type EmbeddedIndicatorRecordViewProps = {
  /** The indicator edit state machine, already opened in edit mode by the host. */
  controller: IndicatorEditController
  /** Host record page — its `confirmNavigation` guards the Back action. */
  hostPage: RecordDetailClientScaffoldContext
  /** Flip the host drilldown back to its list face. */
  onBack: () => void
  /** Bridge the controller's dirtiness up so the host section (and the product primary lock) reflect it. */
  onDirtyChange?: (dirty: boolean) => void
  /** Node rendered left of the Save / Discard / Delete buttons (the per-product stepper). */
  actionsLeading?: ReactNode
}

/**
 * The indicator **edit** face rendered **inside** the product record view's
 * indicators drilldown. Create is a modal (`IndicatorCreateModal`); this face is
 * edit-only. Mirrors `EmbeddedAdjustmentRecordView`.
 */
export function EmbeddedIndicatorRecordView({
  controller,
  hostPage,
  onBack,
  onDirtyChange,
  actionsLeading,
}: EmbeddedIndicatorRecordViewProps) {
  const { open, form, isDirty, canSave, isSaving, error } = controller

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const handleBack = () => hostPage.confirmNavigation(onBack)

  const del = useRecordDeleteConfirmation(async () => {
    try {
      await controller.deleteIndicator()
      onBack()
    } catch {
      // Error already surfaced via `controller.error`; keep the user on the row.
    }
  })

  const actions: RecordSectionSubHeaderAction[] = [
    { key: "back", label: "Show list", tone: "neutral", onClick: handleBack, disabled: isSaving },
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
    { key: "delete", label: "Delete", tone: "destructive", onClick: del.requestDelete, disabled: isSaving },
  ]

  if (!open) {
    return <p className="px-4 py-6 text-sm text-[var(--foreground)]/60">Loading indicator…</p>
  }

  return (
    <div>
      <RecordSectionSubHeader
        canManage={false}
        isDirty={isDirty}
        isSaving={isSaving}
        hasConflict={false}
        error={error}
        actionsLeading={actionsLeading}
        actions={actions}
      />
      <div className={`px-5 py-5 ${RECORD_SECTION_BODY_SURFACE_CLASS_NAME}`}>
        <IndicatorRecordFields
          row={open}
          form={form}
          editable={!isSaving}
          onFieldChange={controller.setField}
        />
      </div>
      <RecordDeleteDialog
        open={del.isOpen}
        isDeleting={del.isDeleting}
        title="Delete indicator?"
        message={buildDeleteConfirmationMessage("indicator")}
        onConfirm={del.confirmDelete}
        onCancel={del.cancelDelete}
      />
    </div>
  )
}
