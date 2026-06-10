import {
  LIST_LABOR_PAYMENTS_MAX_PAGE_SIZE,
  LIST_LABOR_PAYMENTS_PAGE_SIZE,
  type LaborPaymentListRow,
} from "@builders/domain"
import { listLaborPaymentsForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type LaborPaymentsListFilters = Record<string, never>

export async function listLaborPaymentsUseCase(
  input: ListInput<LaborPaymentsListFilters>,
): Promise<ListOutput<LaborPaymentListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_LABOR_PAYMENTS_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(LIST_LABOR_PAYMENTS_MAX_PAGE_SIZE, requestedPageSize),
  )

  const search = input.search?.trim() || undefined

  const { rows, total } = await listLaborPaymentsForListView({
    search,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
