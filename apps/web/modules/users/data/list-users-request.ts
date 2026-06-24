import type { ListInput, ListOutput, UsersListFilters } from "@builders/application"
import { LIST_USERS_PAGE_SIZE, type UserListRow } from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

// Read-only list — pagination only. `filters: {}` (not `undefined`) so the SSR
// prefetch key matches the engine's constructed listInput and hydration hits.
export function parseUsersListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<UsersListFilters> {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    filters: {},
    page,
    pageSize: LIST_USERS_PAGE_SIZE,
  }
}

export function buildUsersListSearchString(
  input: ListInput<UsersListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listUsersRequest(
  input: ListInput<UsersListFilters>,
): Promise<ListOutput<UserListRow>> {
  const queryString = buildUsersListSearchString(input)
  const url = queryString ? `/api/users?${queryString}` : "/api/users"
  return requestJson<ListOutput<UserListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const USERS_LIST_QUERY_KEY = ["users", "list"] as const
