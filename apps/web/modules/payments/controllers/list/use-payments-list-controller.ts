"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import type { PaymentListRow } from "@builders/domain"

const PAYMENTS_RECORD_PATH = "/dashboard/payments/record"

/**
 * Drives the dashboard payments list. A row opens the standalone payment record
 * view in edit mode; the create entry opens the same route with no id (create
 * face). Payments stand alone — there is no parent record to route into.
 */
export function usePaymentsListController() {
  const router = useRouter()

  const openPayment = useCallback(
    (row: PaymentListRow) => {
      router.push(`${PAYMENTS_RECORD_PATH}?paymentId=${row.id}`, { scroll: false })
    },
    [router],
  )

  const openCreate = useCallback(() => {
    router.push(PAYMENTS_RECORD_PATH, { scroll: false })
  }, [router])

  return { openPayment, openCreate }
}
