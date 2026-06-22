import {
  LIST_PAYMENTS_MAX_PAGE_SIZE,
  LIST_PAYMENTS_PAGE_SIZE,
  type PaymentListFilters,
  type PaymentListRow,
} from "@builders/domain"
import { listPaymentsForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type PaymentsListFilters = PaymentListFilters

export async function listPaymentsUseCase(
  input: ListInput<PaymentsListFilters>,
): Promise<ListOutput<PaymentListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_PAYMENTS_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_PAYMENTS_MAX_PAGE_SIZE, requestedPageSize))

  const paymentNumber = input.filters?.paymentNumber?.trim() || undefined

  const { rows, total } = await listPaymentsForListView({
    skip: (page - 1) * pageSize,
    take: pageSize,
    paymentNumber,
  })

  return { rows, total }
}
