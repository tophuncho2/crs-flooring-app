"use client"

import {
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
  RecordDeleteDialog,
  RecordSectionSubHeader,
  buildDeleteConfirmationMessage,
  useRecordDeleteConfirmation,
  type RecordSectionSubHeaderAction,
} from "@/engines/record-view"
import type { Payment } from "@builders/domain"
import { usePaymentRecordController } from "@/modules/payments/controllers/record/use-payment-record-controller"
import { PaymentRecordFormFields } from "./payment-record-form-fields"

export type PaymentRecordClientProps = {
  /** The row being edited, or `null` to open the create face. */
  initialPayment: Payment | null
}

export default function PaymentRecordClient({ initialPayment }: PaymentRecordClientProps) {
  const controller = usePaymentRecordController({
    initial: initialPayment ? { mode: "edit", payment: initialPayment } : { mode: "create" },
  })
  const { open, isDirty, canSave, isSaving, error } = controller
  const isCreate = open.mode === "create"

  const del = useRecordDeleteConfirmation(async () => {
    try {
      await controller.deletePayment()
    } catch {
      // Error already surfaced via `controller.error`; keep the user on the row.
    }
  })

  const actions: RecordSectionSubHeaderAction[] = [
    {
      key: "back",
      label: "Show list",
      tone: "neutral",
      onClick: controller.backToList,
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
    ...(open.mode === "edit"
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

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <div className="px-4 pt-3">
          <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
            {isCreate ? "New Payment" : `Payment ${open.payment.paymentNumber}`}
          </span>
        </div>
        <RecordSectionSubHeader
          canManage={false}
          isDirty={isDirty}
          isSaving={isSaving}
          hasConflict={false}
          error={error}
          actions={actions}
        />
        <div className={`px-5 py-5 ${RECORD_SECTION_BODY_SURFACE_CLASS_NAME}`}>
          <PaymentRecordFormFields controller={controller} />
        </div>
      </div>
      <RecordDeleteDialog
        open={del.isOpen}
        isDeleting={del.isDeleting}
        title="Delete payment?"
        message={buildDeleteConfirmationMessage("payment")}
        onConfirm={del.confirmDelete}
        onCancel={del.cancelDelete}
      />
    </div>
  )
}
