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
import { LaborPaymentEditFormFields } from "./labor-payment-edit-form-fields"
import type { LaborPaymentEditController } from "@/modules/contacts/controllers/record/labor-payments/use-labor-payment-edit-controller"

export type EmbeddedLaborPaymentRecordViewProps = {
  /** The labor-payment state machine, already opened (create/edit) by the host. */
  controller: LaborPaymentEditController
  /** Host record page — its `confirmNavigation` guards the Back action. */
  hostPage: RecordDetailClientScaffoldContext
  /** Flip the host drilldown back to its list face. */
  onBack: () => void
  /** Bridge the controller's dirtiness up so the host section reflects it. */
  onDirtyChange?: (dirty: boolean) => void
}

/**
 * The labor-payment edit/create face rendered **inside** the contact record
 * view's drilldown section. Chrome-less: a `RecordSectionSubHeader` action row
 * (Show list / Save|Create / Discard / Delete) above the editable form fields.
 * The host owns the open spec; this only renders state, bridges dirtiness, and
 * routes Back through the shared host guard. Mirrors
 * `EmbeddedAdjustmentRecordView`.
 */
export function EmbeddedLaborPaymentRecordView({
  controller,
  hostPage,
  onBack,
  onDirtyChange,
}: EmbeddedLaborPaymentRecordViewProps) {
  const { open, isDirty, canSave, isSaving, error } = controller

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const isCreate = open?.mode === "create"
  const laborPayment = open?.mode === "edit" ? open.laborPayment : null

  const handleBack = () => hostPage.confirmNavigation(onBack)

  const del = useRecordDeleteConfirmation(async () => {
    try {
      await controller.deleteLaborPayment()
      onBack()
    } catch {
      // Error already surfaced via `controller.error`; keep the user on the row.
    }
  })

  const showDelete = laborPayment != null

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
      onClick: () => void controller.save(),
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
    return <p className="px-4 py-6 text-sm text-[var(--foreground)]/60">Loading labor payment…</p>
  }

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
        <LaborPaymentEditFormFields controller={controller} />
      </div>
      <RecordDeleteDialog
        open={del.isOpen}
        isDeleting={del.isDeleting}
        title="Delete labor payment?"
        message={buildDeleteConfirmationMessage("labor payment")}
        onConfirm={del.confirmDelete}
        onCancel={del.cancelDelete}
      />
    </div>
  )
}
