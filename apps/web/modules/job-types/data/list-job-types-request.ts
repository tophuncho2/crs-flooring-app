import type {
  JobTypesListFilters,
  ListInput,
  ListOutput,
} from "@builders/application"
import {
  LIST_JOB_TYPES_PAGE_SIZE,
  type JobTypeListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const raw = searchParams?.[key]
  return Array.isArray(raw) ? raw[0] : raw
}

export function parseJobTypesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<JobTypesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    search: searchRaw || undefined,
    page,
    pageSize: LIST_JOB_TYPES_PAGE_SIZE,
  }
}

export function buildJobTypesListSearchString(
  input: ListInput<JobTypesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listJobTypesRequest(
  input: ListInput<JobTypesListFilters>,
): Promise<ListOutput<JobTypeListRow>> {
  const queryString = buildJobTypesListSearchString(input)
  const url = queryString ? `/api/job-types?${queryString}` : "/api/job-types"
  return requestJson<ListOutput<JobTypeListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const JOB_TYPES_LIST_QUERY_KEY = ["job-types", "list"] as const
