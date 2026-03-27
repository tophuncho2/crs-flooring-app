export function buildCanonicalDetailHref(basePath: string, recordId: string, returnTo?: string | null) {
  const normalizedBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath
  const detailPath = `${normalizedBasePath}/${recordId}`

  if (!returnTo) {
    return detailPath
  }

  const searchParams = new URLSearchParams()
  searchParams.set("returnTo", returnTo)
  return `${detailPath}?${searchParams.toString()}`
}

export function buildCurrentPath(pathname: string, searchParams: URLSearchParams | ReadonlyURLSearchParamsLike) {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function resolveReturnTo(
  returnTo: string | string[] | undefined,
  fallbackHref: string,
) {
  if (typeof returnTo !== "string") {
    return fallbackHref
  }

  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return fallbackHref
  }

  return returnTo
}

type ReadonlyURLSearchParamsLike = {
  toString(): string
}
