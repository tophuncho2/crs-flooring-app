import type {
  ListInput,
  ListOutput,
  ListSort,
  ProductsListFilters,
} from "@builders/application"
import {
  LIST_PRODUCTS_PAGE_SIZE,
  type ProductListRow,
} from "@builders/domain"
import { requestJson } from "@/transport/http"

/**
 * UI-exposed sortable fields (backend keys). Must stay identical to
 * `PRODUCTS_SORT_OPTIONS` (the derived client allowlist) and the API
 * validator's `PRODUCTS_UI_SORT_FIELDS` — the sort-allowlist-sync test guards
 * this. `category` resolves to `category.name` server-side.
 */
export const PRODUCTS_LIST_SORT_FIELDS = [
  "category",
  "style",
  "color",
  "createdAt",
  "updatedAt",
] as const

/** Cap on user-selected sort columns — mirrors the engine + API + use case. */
const PRODUCTS_MAX_SORT_LEVELS = 3

function isAllowedSortField(value: string): boolean {
  return (PRODUCTS_LIST_SORT_FIELDS as readonly string[]).includes(value)
}

/** Parse the ordered `?sorts=field:dir,field:dir` param (validated, deduped, capped). */
function parseSortsParam(raw: string | undefined): ListSort[] {
  if (!raw) return []
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !isAllowedSortField(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "asc" ? "asc" : "desc" })
    if (result.length >= PRODUCTS_MAX_SORT_LEVELS) break
  }
  return result
}

function encodeSortsParam(sorts: readonly ListSort[]): string {
  return sorts.map((entry) => `${entry.field}:${entry.direction}`).join(",")
}

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

export function parseProductsListInputFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListInput<ProductsListFilters> {
  const searchRaw = (readSearchParam(searchParams, "q") ?? "").trim()
  const prodNumberRaw = (readSearchParam(searchParams, "prodNumber") ?? "").trim()
  const colorRaw = (readSearchParam(searchParams, "color") ?? "").trim()
  const styleRaw = (readSearchParam(searchParams, "style") ?? "").trim()
  const namingAddonRaw = (readSearchParam(searchParams, "namingAddon") ?? "").trim()
  const pageRaw = Number(readSearchParam(searchParams, "page"))
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  const categoryId = Array.from(
    new Set(readSearchParamArray(searchParams, "categoryId")),
  )

  // Multi-column sort via `?sorts=`. With no sort param the list falls back to
  // the server's uniform base order (createdAt desc, id desc) — pass empty so the
  // SSR key matches the client's de-seeded first render (nothing reads as sorted).
  const sorts = parseSortsParam(readSearchParam(searchParams, "sorts"))

  return {
    search: searchRaw || undefined,
    filters:
      prodNumberRaw || colorRaw || styleRaw || namingAddonRaw || categoryId.length > 0
        ? {
            ...(prodNumberRaw ? { prodNumber: prodNumberRaw } : {}),
            ...(colorRaw ? { color: colorRaw } : {}),
            ...(styleRaw ? { style: styleRaw } : {}),
            ...(namingAddonRaw ? { namingAddon: namingAddonRaw } : {}),
            ...(categoryId.length > 0 ? { categoryId } : {}),
          }
        : undefined,
    ...(sorts.length > 0 ? { sort: sorts[0], sorts } : {}),
    page,
    pageSize: LIST_PRODUCTS_PAGE_SIZE,
  }
}

export function buildProductsListSearchString(
  input: ListInput<ProductsListFilters>,
): string {
  const params = new URLSearchParams()
  const sorts = input.sorts?.length ? input.sorts : input.sort ? [input.sort] : []
  if (sorts.length > 0) params.set("sorts", encodeSortsParam(sorts))
  if (input.search) params.set("q", input.search)
  if (input.filters?.prodNumber) params.set("prodNumber", input.filters.prodNumber)
  if (input.filters?.color) params.set("color", input.filters.color)
  if (input.filters?.style) params.set("style", input.filters.style)
  if (input.filters?.namingAddon) params.set("namingAddon", input.filters.namingAddon)
  for (const id of input.filters?.categoryId ?? []) {
    params.append("categoryId", id)
  }
  if (input.page && input.page !== 1) params.set("page", String(input.page))
  if (input.pageSize) params.set("pageSize", String(input.pageSize))
  return params.toString()
}

export async function listProductsRequest(
  input: ListInput<ProductsListFilters>,
): Promise<ListOutput<ProductListRow>> {
  const queryString = buildProductsListSearchString(input)
  const url = queryString ? `/api/products?${queryString}` : "/api/products"
  return requestJson<ListOutput<ProductListRow>>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
}

export const PRODUCTS_LIST_QUERY_KEY = ["products", "list"] as const
