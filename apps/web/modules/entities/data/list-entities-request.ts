import type {
  ListInput,
  ListOutput,
  EntitiesListFilters,
} from "@builders/application"
import {
  LIST_ENTITIES_PAGE_SIZE,
  type EntityListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

function readSearchParamArray(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string[] {
  const raw = searchParams?.[key]
  if (raw === undefined) return []
  const list = Array.isArray(raw) ? raw : [raw]
  return list
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export function parseEntitiesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<EntitiesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const state = Array.from(
    new Set(
      readSearchParamArray(searchParams, "state")
        .map((entry) => entry.toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )

  const entityTypeIds = Array.from(
    new Set(readSearchParamArray(searchParams, "entityTypeIds")),
  )

  const filters =
    state.length > 0 || entityTypeIds.length > 0
      ? {
          ...(state.length > 0 ? { state } : {}),
          ...(entityTypeIds.length > 0 ? { entityTypeIds } : {}),
        }
      : undefined

  return {
    search: searchRaw || undefined,
    filters,
    page,
    pageSize: LIST_ENTITIES_PAGE_SIZE,
  }
}

function buildEntitiesListSearchString(
  input: ListInput<EntitiesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  for (const code of input.filters?.state ?? []) {
    params.append("state", code)
  }
  for (const typeId of input.filters?.entityTypeIds ?? []) {
    params.append("entityTypeIds", typeId)
  }
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listEntitiesRequest(
  input: ListInput<EntitiesListFilters>,
): Promise<ListOutput<EntityListRow>> {
  const queryString = buildEntitiesListSearchString(input)
  const url = queryString
    ? `/api/entities?${queryString}`
    : "/api/entities"
  return requestJson<ListOutput<EntityListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const ENTITIES_LIST_QUERY_KEY = [
  "entities",
  "list",
] as const
