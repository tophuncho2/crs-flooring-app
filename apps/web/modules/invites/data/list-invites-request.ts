import type { InvitesListFilters, ListInput, ListOutput } from "@builders/application"
import { LIST_INVITES_PAGE_SIZE, type InviteListRow } from "@builders/domain"
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
export function parseInvitesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<InvitesListFilters> {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    filters: {},
    page,
    pageSize: LIST_INVITES_PAGE_SIZE,
  }
}

export function buildInvitesListSearchString(
  input: ListInput<InvitesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listInvitesRequest(
  input: ListInput<InvitesListFilters>,
): Promise<ListOutput<InviteListRow>> {
  const queryString = buildInvitesListSearchString(input)
  const url = queryString ? `/api/invites?${queryString}` : "/api/invites"
  return requestJson<ListOutput<InviteListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const INVITES_LIST_QUERY_KEY = ["invites", "list"] as const
