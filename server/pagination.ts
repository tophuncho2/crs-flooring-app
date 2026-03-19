export const DEFAULT_SERVER_PAGE_SIZE = 50

export type ServerPagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  skip: number
  take: number
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
