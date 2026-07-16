import {
  LIST_WORK_ORDER_DOCUMENT_TYPES_MAX_PAGE_SIZE,
  LIST_WORK_ORDER_DOCUMENT_TYPES_PAGE_SIZE,
  type WorkOrderDocumentTypeListRow,
  type WorkOrderDocumentTypeOption,
} from "@builders/domain"
import {
  listWorkOrderDocumentTypeOptions,
  listWorkOrderDocumentTypesForListView,
} from "@builders/db"
import type { ListInput, ListOutput } from "../list-view/contracts.js"

export type WorkOrderDocumentTypesListFilters = {
  // Exact ROW-number search (matches `workOrderDocumentTypeNumberInt`); accepts "7" or "ROW-7".
  workOrderDocumentTypeNumber?: string
}

export async function listWorkOrderDocumentTypesUseCase(
  input: ListInput<WorkOrderDocumentTypesListFilters>,
): Promise<ListOutput<WorkOrderDocumentTypeListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_WORK_ORDER_DOCUMENT_TYPES_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(LIST_WORK_ORDER_DOCUMENT_TYPES_MAX_PAGE_SIZE, requestedPageSize),
  )

  const search = input.search?.trim() || undefined
  const workOrderDocumentTypeNumber =
    input.filters?.workOrderDocumentTypeNumber?.trim() || undefined

  const { rows, total } = await listWorkOrderDocumentTypesForListView({
    search,
    workOrderDocumentTypeNumber,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}

/**
 * All doc types as {id,name,color,printConfig} options — the print configurator's
 * doc-type selector loads this to render its options and seed its checkboxes.
 */
export async function listWorkOrderDocumentTypeOptionsUseCase(): Promise<
  WorkOrderDocumentTypeOption[]
> {
  return listWorkOrderDocumentTypeOptions()
}
