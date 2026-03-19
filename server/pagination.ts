export const DEFAULT_SERVER_PAGE_SIZE = 50

export type ServerPagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  skip: number
  take: number
}

export type ServerTableQueryState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
}

export function parsePageParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value
  const numericValue = Number(rawValue)

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return 1
  }

  return Math.floor(numericValue)
}

export function createServerPagination({
  page,
  totalItems,
  pageSize = DEFAULT_SERVER_PAGE_SIZE,
}: {
  page: number
  totalItems: number
  pageSize?: number
}): ServerPagination {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  }
}

export function buildPageHref(pathname: string, page: number) {
  return page <= 1 ? pathname : `${pathname}?page=${page}`
}

export function parseServerTableQueryState({
  searchParams,
  defaultGrouped = false,
  defaultGroupKeys = [],
  allowedGroupKeys = [],
}: {
  searchParams?: Record<string, string | string[] | undefined>
  defaultGrouped?: boolean
  defaultGroupKeys?: string[]
  allowedGroupKeys?: string[]
}): ServerTableQueryState {
  const searchQuery = String(Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q ?? "").trim()
  const sort = String(Array.isArray(searchParams?.sort) ? searchParams?.sort[0] : searchParams?.sort ?? "").trim().toLowerCase()
  const grouped = String(Array.isArray(searchParams?.grouped) ? searchParams?.grouped[0] : searchParams?.grouped ?? "").trim()
  const rawGroupKeys = String(Array.isArray(searchParams?.groups) ? searchParams?.groups[0] : searchParams?.groups ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const filteredGroupKeys = rawGroupKeys.filter((key) => allowedGroupKeys.length === 0 || allowedGroupKeys.includes(key)).slice(0, 3)
  const groupByKeys = filteredGroupKeys.length > 0 ? filteredGroupKeys : defaultGroupKeys.filter((key) => allowedGroupKeys.length === 0 || allowedGroupKeys.includes(key)).slice(0, 3)

  return {
    searchQuery,
    isAscendingSort: sort !== "desc",
    isGroupingEnabled: grouped ? grouped !== "0" : defaultGrouped,
    groupByKeys,
  }
}

export function appendUniqueOrderBy<T>(values: T[], nextValue: T | null | undefined) {
  if (!nextValue) return values
  const serializedValue = JSON.stringify(nextValue)
  if (values.some((value) => JSON.stringify(value) === serializedValue)) {
    return values
  }
  values.push(nextValue)
  return values
}
