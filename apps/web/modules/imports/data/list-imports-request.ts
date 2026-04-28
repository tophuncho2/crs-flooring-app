import type { ImportsListFilters } from "@builders/application"
import type { ListInput, ListOutput } from "@builders/application"
import {
  LIST_IMPORTS_PAGE_SIZE,
  type ImportRow,
  type ListImportsAllowedGroupField,
  type TablePreferencePayload,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

export type ImportsListInitialDefaults = {
  isAscendingSort?: boolean
  groupField?: ListImportsAllowedGroupField | null
}

const ALLOWED_GROUP_FIELDS: ReadonlyArray<ListImportsAllowedGroupField> = ["warehouse", "manufacturer"]

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

function defaultsFromTablePreferences(
  preferences?: TablePreferencePayload | null,
): ImportsListInitialDefaults {
  if (!preferences) return {}
  const groupKey = preferences.grouping.enabled
    ? preferences.grouping.keys[0]
    : undefined
  return {
    isAscendingSort: preferences.sort.direction === "asc",
    groupField:
      groupKey && (ALLOWED_GROUP_FIELDS as readonly string[]).includes(groupKey)
        ? (groupKey as ListImportsAllowedGroupField)
        : null,
  }
}

export function parseImportsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  preferences?: TablePreferencePayload | null,
): ListInput<ImportsListFilters> {
  const defaults = defaultsFromTablePreferences(preferences)

  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const sortRaw = (readSearchParam(searchParams, "sort") ?? "").trim().toLowerCase()
  const groupedRaw = (readSearchParam(searchParams, "grouped") ?? "").trim()
  const groupsRaw = (readSearchParam(searchParams, "groups") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))

  const direction: "asc" | "desc" =
    sortRaw === "desc" || sortRaw === "asc"
      ? sortRaw
      : defaults.isAscendingSort === false
        ? "desc"
        : "asc"

  const isGroupedExplicit = groupedRaw === "1" || groupedRaw === "0"
  const isGrouped = isGroupedExplicit
    ? groupedRaw === "1"
    : defaults.groupField !== null && defaults.groupField !== undefined

  const firstGroupKey = groupsRaw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)[0]

  const groupCandidate: string | null = isGrouped
    ? (firstGroupKey ?? defaults.groupField ?? null)
    : null

  const validGroupField =
    groupCandidate && (ALLOWED_GROUP_FIELDS as readonly string[]).includes(groupCandidate)
      ? (groupCandidate as ListImportsAllowedGroupField)
      : null

  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    search: searchRaw || undefined,
    sort: { field: "importNumber", direction },
    group: validGroupField ? { field: validGroupField } : undefined,
    page,
    pageSize: LIST_IMPORTS_PAGE_SIZE,
  }
}

export function buildImportsListSearchString(input: ListInput<ImportsListFilters>): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  if (input.sort) params.set("sort", input.sort.direction)
  if (input.group) {
    params.set("grouped", "1")
    params.set("groups", input.group.field)
  }
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listImportsRequest(
  input: ListInput<ImportsListFilters>,
): Promise<ListOutput<ImportRow>> {
  const queryString = buildImportsListSearchString(input)
  const url = queryString ? `/api/imports?${queryString}` : "/api/imports"
  return requestJson<ListOutput<ImportRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const IMPORTS_LIST_QUERY_KEY = ["imports", "list"] as const
