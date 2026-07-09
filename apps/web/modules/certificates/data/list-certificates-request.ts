import type { CertificatesListFilters, ListInput, ListOutput } from "@builders/application"
import { LIST_CERTIFICATES_PAGE_SIZE, type CertificateListRow } from "@builders/domain"
import { requestJson } from "@/transport/http"

function readSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string[] {
  const raw = searchParams?.[key]
  if (raw === undefined) return []
  return Array.isArray(raw) ? raw : [raw]
}

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  return readSearchParams(searchParams, key)[0]
}

export function parseCertificatesListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<CertificatesListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const entityId = Array.from(
    new Set(
      readSearchParams(searchParams, "entityId")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )

  return {
    search: searchRaw || undefined,
    filters: entityId.length > 0 ? { entityId } : undefined,
    page,
    pageSize: LIST_CERTIFICATES_PAGE_SIZE,
  }
}

export function buildCertificatesListSearchString(
  input: ListInput<CertificatesListFilters>,
): string {
  const params = new URLSearchParams()
  if (input.search) params.set("q", input.search)
  for (const id of input.filters?.entityId ?? []) params.append("entityId", id)
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listCertificatesRequest(
  input: ListInput<CertificatesListFilters>,
): Promise<ListOutput<CertificateListRow>> {
  const queryString = buildCertificatesListSearchString(input)
  const url = queryString ? `/api/certificates?${queryString}` : "/api/certificates"
  return requestJson<ListOutput<CertificateListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const CERTIFICATES_LIST_QUERY_KEY = ["certificates", "list"] as const
