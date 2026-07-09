"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { RecordItemSection, confirmRecordDelete } from "@/engines/record-view"
import type { Payment, WorkOrderDetail } from "@builders/domain"
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
  const [modalOpen, setModalOpen] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const count = payments.length

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
      const returnTo = buildWorkOrderRecordHref(workOrder.id)
      router.push(
        `${PAYMENTS_RECORD_PATH}?paymentId=${row.id}&returnTo=${encodeURIComponent(returnTo)}`,
      )
    },
    [router, workOrder.id],
  )

  const deletePayment = useCallback(
    async (row: Payment) => {
      if (!confirmRecordDelete("Delete this payment? This permanently removes it everywhere, not just from this work order. This cannot be undone.")) {
        return
      }
      setIsBusy(true)
      try {
        await deletePaymentRequest(row.id, row.updatedAt)
        reconcile()
      } finally {
        setIsBusy(false)
      }
    },
    [reconcile],
  )

  return (
    <>
      <RecordItemSection
        title="Payments"
        // Read-only grid (no managed save/discard) — but the "+ Add Payment"
        // action must render, so opt into supportsAddRow while leaving editable
        // false. The `item` default suppresses add-row actions, which is why the
        // button was invisible.
        capabilities={{ editable: false, supportsAddRow: true }}
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
              disabled: isBusy,
            },
          ],
        }}
      >
        <PaymentsTable
          rows={payments}
          onOpenPayment={openPayment}
          fill={false}
          rowActions={(row) => renderPaymentRowActions(row, { onDelete: deletePayment }, isBusy)}
        />
      </RecordItemSection>

      {/* Mounted as a SIBLING of the section (mirrors the adjustment create
          modal), NOT inside RecordItemSection's children: RecordModal renders a
          non-portaled `fixed inset-0` overlay, so nesting it inside the section
          traps the overlay in the section's stacking/containing-block context
          and the app shell (nav rail, back button, record stepper) paints over
          it. As a sibling the overlay covers the full viewport as intended. */}
      {modalOpen ? (
        <WorkOrderPaymentCreateModal
          workOrder={workOrder}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false)
            reconcile()
          }}
        />
      ) : null}
    </>
  )
}
