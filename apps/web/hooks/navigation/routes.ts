export type RecordEntryAction =
  | {
      kind: "route"
      href: string
    }
  | {
      kind: "inline"
      onTrigger: () => void
    }

type SearchParamsLike = {
  toString(): string
}

export function buildCurrentRecordEntryPath(
  pathname: string,
  searchParams: URLSearchParams | SearchParamsLike,
) {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function buildRecordDetailHref(basePath: string, recordId: string, returnTo?: string | null) {
  const normalizedBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath
  const detailPath = `${normalizedBasePath}/${recordId}`

  if (!returnTo) {
    return detailPath
  }

  const searchParams = new URLSearchParams()
  searchParams.set("returnTo", returnTo)
  return `${detailPath}?${searchParams.toString()}`
}

export function buildRecordCreateHref(
  basePath: string,
  options?: {
    returnTo?: string | null
    params?: Record<string, string | null | undefined>
  },
) {
  const normalizedBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath
  const createPath = `${normalizedBasePath}/new`
  const searchParams = new URLSearchParams()

  if (options?.returnTo) {
    searchParams.set("returnTo", options.returnTo)
  }

  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value) {
        searchParams.set(key, value)
      }
    }
  }

  const query = searchParams.toString()
  return query ? `${createPath}?${query}` : createPath
}

const MANAGEMENT_COMPANIES_BASE = "/dashboard/management-companies"

/**
 * The single entry point for "open a property". A property never has its own
 * record page — it always lives inside its management company's record view.
 * When the property has an MC, open that MC drilled into the property
 * (`?property=`); when it has none, open the MC **create** flow that will link
 * this property on save. Shared by every property entry point (the list, the
 * WO/template "✎ Property" buttons, the template-sync arrow).
 */
export function buildPropertyRecordHref(
  propertyId: string,
  managementCompanyId: string | null,
  returnTo?: string | null,
) {
  if (managementCompanyId) {
    const searchParams = new URLSearchParams()
    searchParams.set("property", propertyId)
    if (returnTo) searchParams.set("returnTo", returnTo)
    return `${MANAGEMENT_COMPANIES_BASE}/${managementCompanyId}?${searchParams.toString()}`
  }

  return buildRecordCreateHref(MANAGEMENT_COMPANIES_BASE, {
    returnTo,
    params: { property: propertyId },
  })
}

export function resolveRecordEntryReturnTo(
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
