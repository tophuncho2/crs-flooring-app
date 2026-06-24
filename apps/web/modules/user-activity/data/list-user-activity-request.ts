import type {
  ListInput,
  ListOutput,
  UserLoginActivityListFilters,
} from "@builders/application"
import {
  LIST_USER_LOGIN_ACTIVITY_PAGE_SIZE,
  type UserLoginActivityListRow,
} from "@builders/domain"
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
export function parseUserActivityListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<UserLoginActivityListFilters> {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    filters: {},
    page,
    pageSize: LIST_USER_LOGIN_ACTIVITY_PAGE_SIZE,
  }
}

export function buildUserActivityListSearchString(
  input: ListInput<UserLoginActivityListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listUserActivityRequest(
  input: ListInput<UserLoginActivityListFilters>,
): Promise<ListOutput<UserLoginActivityListRow>> {
  const queryString = buildUserActivityListSearchString(input)
  const url = queryString ? `/api/user-activity?${queryString}` : "/api/user-activity"
  return requestJson<ListOutput<UserLoginActivityListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const USER_ACTIVITY_LIST_QUERY_KEY = ["user-activity", "list"] as const
