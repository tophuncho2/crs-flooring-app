import type {
  EntityTypesListFilters,
  ListInput,
  ListOutput,
} from "@builders/application"
import {
  LIST_ENTITY_TYPES_PAGE_SIZE,
  type EntityTypeListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parseEntityTypesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<EntityTypesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const entityTypeNumberRaw = (readSearchParam(searchParams, "entityTypeNumber") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    search: searchRaw || undefined,
    filters: entityTypeNumberRaw ? { entityTypeNumber: entityTypeNumberRaw } : undefined,
    page,
    pageSize: LIST_ENTITY_TYPES_PAGE_SIZE,
  }
}

export function buildEntityTypesListSearchString(
  input: ListInput<EntityTypesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  const entityTypeNumber = input.filters?.entityTypeNumber?.trim()
  if (entityTypeNumber) params.set("entityTypeNumber", entityTypeNumber)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listEntityTypesRequest(
  input: ListInput<EntityTypesListFilters>,
): Promise<ListOutput<EntityTypeListRow>> {
  const queryString = buildEntityTypesListSearchString(input)
  const url = queryString ? `/api/entity-types?${queryString}` : "/api/entity-types"
  return requestJson<ListOutput<EntityTypeListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const ENTITY_TYPES_LIST_QUERY_KEY = ["entity-types", "list"] as const
