import type {
  ListInput,
  ListOutput,
  UnitOfMeasuresListFilters,
} from "@builders/application"
import {
  LIST_UNIT_OF_MEASURES_PAGE_SIZE,
  type UnitOfMeasureListRow,
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
export function parseUnitOfMeasuresListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<UnitOfMeasuresListFilters> {
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    filters: {},
    page,
    pageSize: LIST_UNIT_OF_MEASURES_PAGE_SIZE,
  }
}

export function buildUnitOfMeasuresListSearchString(
  input: ListInput<UnitOfMeasuresListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listUnitOfMeasuresRequest(
  input: ListInput<UnitOfMeasuresListFilters>,
): Promise<ListOutput<UnitOfMeasureListRow>> {
  const queryString = buildUnitOfMeasuresListSearchString(input)
  const url = queryString
    ? `/api/unit-of-measures?${queryString}`
    : "/api/unit-of-measures"
  return requestJson<ListOutput<UnitOfMeasureListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const UNIT_OF_MEASURES_LIST_QUERY_KEY = ["unit-of-measures", "list"] as const
