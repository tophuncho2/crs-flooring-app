"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import type { LaborPaymentListRow } from "@builders/domain"
import {
  NEW_LABOR_PAYMENT_ID,
  buildContactLaborPaymentHref,
  useRecordEntryNavigation,
} from "@/hooks/navigation"

/**
 * Drives the dashboard labor-payments list. Both entry points route into the
 * linked contact's record view (the standalone labor-payment record/create views
 * are gone): a row opens that contact at the payment in edit mode; the create
 * entry opens the picked contact at the create face.
 */
export function useLaborPaymentsListController() {
  const router = useRouter()
  const { returnTo } = useRecordEntryNavigation("/dashboard/labor-payments")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  const openLaborPayment = useCallback(
    (row: LaborPaymentListRow) => {
      router.push(buildContactLaborPaymentHref(row.contactId, row.id, returnTo), {
        scroll: false,
      })
    },
    [router, returnTo],
  )

  const openCreateForContact = useCallback(
    (contactId: string) => {
      router.push(buildContactLaborPaymentHref(contactId, NEW_LABOR_PAYMENT_ID, returnTo), {
        scroll: false,
      })
    },
    [router, returnTo],
  )

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openLaborPayment,
    openCreateForContact,
  }
}
