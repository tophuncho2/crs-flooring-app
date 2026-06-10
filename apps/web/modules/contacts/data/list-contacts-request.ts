import type {
  ContactsListFilters,
  ListInput,
  ListOutput,
} from "@builders/application"
import {
  LIST_CONTACTS_PAGE_SIZE,
  type ContactListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parseContactsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<ContactsListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    search: searchRaw || undefined,
    page,
    pageSize: LIST_CONTACTS_PAGE_SIZE,
  }
}

export function buildContactsListSearchString(
  input: ListInput<ContactsListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listContactsRequest(
  input: ListInput<ContactsListFilters>,
): Promise<ListOutput<ContactListRow>> {
  const queryString = buildContactsListSearchString(input)
  const url = queryString ? `/api/contacts?${queryString}` : "/api/contacts"
  return requestJson<ListOutput<ContactListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const CONTACTS_LIST_QUERY_KEY = ["contacts", "list"] as const
