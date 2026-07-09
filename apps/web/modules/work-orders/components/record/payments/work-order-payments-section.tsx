"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  ChoiceDialog,
  RecordDeleteDialog,
  RecordItemSection,
  useRecordCreateChoice,
  useRecordDeleteConfirmation,
} from "@/engines/record-view"
import type { Payment, WorkOrderDetail } from "@builders/domain"
import { getClientErrorMessage } from "@/transport"
import { buildWorkOrderRecordHref } from "@/hooks/navigation/routes"
import { PaymentsTable } from "@/modules/payments/components/list/payments-table"
import { renderPaymentRowActions } from "@/modules/payments/components/list/table/payment-row-actions"
import { deletePaymentRequest } from "@/modules/payments/data/mutations"
import { WorkOrderPaymentCreateModal } from "./work-order-payment-create-modal"

const PAYMENTS_RECORD_PATH = "/dashboard/payments/record"

/**
 * The work order's Payments section — a READ-ONLY grid of the real payments
 * (`FlooringPayment`) linked to this work order, newest-first (the read orders
 * `createdAt desc`). Mirrors the read-only Adjustments side, NOT the editable
 * Planned Payments grid: rows are read straight from the server prop (no local
 * state); "+ Add Payment" opens a create modal that pins this WO, then reconciles
 * via `router.refresh()`. Editing is delegated — the row-open (↗) navigates to the
 * payment's own record view (with `returnTo` so Back returns here). A per-row ⋮
 * menu hard-deletes the payment, and that Delete is visible ONLY here (the
 * standalone payments list omits the menu).
 */
export function WorkOrderPaymentsSection({
  workOrder,
  payments,
}: {
  workOrder: WorkOrderDetail
  payments: Payment[]
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const choice = useRecordCreateChoice()
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<Payment | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const count = payments.length

  // The payment record-view href carrying returnTo=this WO, so Back lands here.
  // Shared by the row-open (↗) and the post-create "Go to payment" choice.
  const paymentHref = useCallback(
    (paymentId: string) => {
      const returnTo = buildWorkOrderRecordHref(workOrder.id)
      return `${PAYMENTS_RECORD_PATH}?paymentId=${paymentId}&returnTo=${encodeURIComponent(returnTo)}`
    },
    [workOrder.id],
  )

  // Strong reconcile after create/delete: invalidate the payments + work-orders
  // query caches by prefix, then re-run the RSC loader so this server-prop-fed
  // grid re-reads fresh (matching the Adjustments reconcile contract).
  const reconcile = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["payments"] })
    void queryClient.invalidateQueries({ queryKey: ["work-orders"] })
    router.refresh()
  }, [queryClient, router])

  const openPayment = useCallback(
    (row: Payment) => {
      router.push(paymentHref(row.id))
    },
    [router, paymentHref],
  )

  // Styled destructive confirm (engine hook + preset) rather than window.confirm.
  // The hook owns the open/deleting state; this body runs the hard delete then
  // reconciles. A failure surfaces inline via `deleteError` (the section notice).
  const del = useRecordDeleteConfirmation(async () => {
    if (!pendingPayment) return
    setDeleteError(null)
    try {
      await deletePaymentRequest(pendingPayment.id, pendingPayment.updatedAt)
      reconcile()
    } catch (caught) {
      setDeleteError(getClientErrorMessage(caught, "Could not delete the payment. Please try again."))
    }
  })

  const requestDeletePayment = (row: Payment) => {
    setDeleteError(null)
    setPendingPayment(row)
    del.requestDelete()
  }

  return (
    <>
      <RecordItemSection
        title="Payments"
        // Read-only grid (no managed save/discard) — but the "+ Add Payment"
        // action must render, so opt into supportsAddRow while leaving editable
        // false. The `item` default suppresses add-row actions, which is why the
        // button was invisible.
        capabilities={{ editable: false, supportsAddRow: true }}
        noticeError={deleteError ?? undefined}
        subHeader={{
          // Count as the section summary (renders under supportsSummary, on by
          // default) rather than statusLeading, which only shows with a
          // save-state pill this read-only section doesn't have.
          summary: `${count} payment${count === 1 ? "" : "s"}`,
          isDirty: false,
          isSaving: false,
          hasConflict: false,
          actions: [
            {
              key: "add-payment",
              label: "+ Add Payment",
              kind: "add-row",
              onClick: () => setModalOpen(true),
              disabled: del.isDeleting,
            },
          ],
        }}
      >
        <PaymentsTable
          rows={payments}
          onOpenPayment={openPayment}
          fill={false}
          rowActions={(row) =>
            renderPaymentRowActions(row, { onDelete: requestDeletePayment }, del.isDeleting)
          }
        />
      </RecordItemSection>

      {/* Create modal + delete dialog are mounted as SIBLINGS of the section
          (house convention across every create-modal mount site). Their overlays
          portal to <body> via the record-view dialog engine, so mount location no
          longer matters — the overlay always covers the full viewport. */}
      {modalOpen ? (
        <WorkOrderPaymentCreateModal
          workOrder={workOrder}
          onClose={() => setModalOpen(false)}
          onCreated={(payment) => {
            setModalOpen(false)
            // Ask whether to open the new payment or stay on the work order.
            // "Go" navigates away (Back returns here via returnTo, and the WO's
            // fresh SSR load shows the new row — no reconcile needed); "Stay"
            // reconciles the grid in place.
            choice.present({
              title: "Payment created",
              message: "Go to the new payment, or stay on this work order?",
              destinations: [{ label: "Go to payment", href: paymentHref(payment.id) }],
              stay: { label: "Stay here", onStay: reconcile },
            })
          }}
        />
      ) : null}
      {choice.choiceDialogProps ? <ChoiceDialog {...choice.choiceDialogProps} /> : null}
      <RecordDeleteDialog
        open={del.isOpen}
        isDeleting={del.isDeleting}
        title="Delete payment?"
        message="This permanently removes the payment everywhere, not just from this work order. This cannot be undone."
        onConfirm={del.confirmDelete}
        onCancel={del.cancelDelete}
      />
    </>
  )
}
