import {
  LIST_CONTACTS_MAX_PAGE_SIZE,
  LIST_CONTACTS_PAGE_SIZE,
  type ContactListRow,
} from "@builders/domain"
import { listContactsForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type ContactsListFilters = Record<string, never>

export async function listContactsUseCase(
  input: ListInput<ContactsListFilters>,
): Promise<ListOutput<ContactListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_CONTACTS_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(LIST_CONTACTS_MAX_PAGE_SIZE, requestedPageSize),
  )

  const search = input.search?.trim() || undefined

  const { rows, total } = await listContactsForListView({
    search,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
