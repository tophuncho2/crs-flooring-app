import {
  LIST_PAYMENT_PURPOSES_MAX_PAGE_SIZE,
  LIST_PAYMENT_PURPOSES_PAGE_SIZE,
  normalizeIdFilter,
  type PaymentPurposeListRow,
  type PaymentPurposeOption,
} from "@builders/domain"
import {
  listPaymentPurposeOptionsByIds,
  listPaymentPurposesForListView,
  searchPaymentPurposeOptions,
} from "@builders/db"
import type { ListInput, ListOutput } from "../list-view/contracts.js"

export type PaymentPurposesListFilters = {
  // Exact ROW-number search (matches `paymentPurposeNumberInt`); accepts "7" or "ROW-7".
  paymentPurposeNumber?: string
}

export async function listPaymentPurposesUseCase(
  input: ListInput<PaymentPurposesListFilters>,
): Promise<ListOutput<PaymentPurposeListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_PAYMENT_PURPOSES_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(LIST_PAYMENT_PURPOSES_MAX_PAGE_SIZE, requestedPageSize),
  )

  const search = input.search?.trim() || undefined
  const paymentPurposeNumber = input.filters?.paymentPurposeNumber?.trim() || undefined

  const { rows, total } = await listPaymentPurposesForListView({
    search,
    paymentPurposeNumber,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}

/**
 * Resolve {id,name,color} options for a known id set — seeds chip labels for
 * URL-restored payment-purpose filters. Not wired to a route yet — kept ready
 * for the payments linking pass.
 */
export async function listPaymentPurposeOptionsByIdsUseCase(
  ids: ReadonlyArray<string> | undefined,
): Promise<PaymentPurposeOption[]> {
  const cleaned = normalizeIdFilter(ids)
  if (!cleaned) return []
  return listPaymentPurposeOptionsByIds(cleaned)
}

export type SearchPaymentPurposeOptionsInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchPaymentPurposeOptionsResult = {
  items: PaymentPurposeOption[]
  hasMore: boolean
}

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

export async function searchPaymentPurposeOptionsUseCase(
  input: SearchPaymentPurposeOptionsInput,
): Promise<SearchPaymentPurposeOptionsResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchPaymentPurposeOptions({ search, skip, take })
}
