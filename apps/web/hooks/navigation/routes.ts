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
 * WO/template "✎ Property" buttons, the template hub arrow).
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

const TEMPLATE_HUB_BASE = "/dashboard/templates/edit"

/**
 * The single entry point for "open a template". Templates have no standalone
 * record page — they live on the template hub (`/dashboard/templates/edit`),
 * selected via `?templateId=`. Pass whatever the caller already knows
 * (property/MC ids + labels) so the cascade pickers seed immediately; a caller
 * with only the id is fine — the hub fills the pickers from the loaded template.
 * No args → the empty hub (the app-shell icon entry). Shared by the templates
 * list, the MC record view's templates section, a work-order's template arrow,
 * and the create-template success redirect.
 */
export function buildTemplateHubHref(options?: {
  templateId?: string | null
  templateLabel?: string | null
  propertyId?: string | null
  propertyLabel?: string | null
  managementCompanyId?: string | null
  managementCompanyLabel?: string | null
  returnTo?: string | null
}): string {
  const searchParams = new URLSearchParams()
  const set = (key: string, value: string | null | undefined) => {
    if (value) searchParams.set(key, value)
  }
  set("templateId", options?.templateId)
  set("templateLabel", options?.templateLabel)
  set("propertyId", options?.propertyId)
  set("propertyLabel", options?.propertyLabel)
  set("managementCompanyId", options?.managementCompanyId)
  set("managementCompanyLabel", options?.managementCompanyLabel)
  set("returnTo", options?.returnTo)

  const query = searchParams.toString()
  return query ? `${TEMPLATE_HUB_BASE}?${query}` : TEMPLATE_HUB_BASE
}

const INVENTORY_RECORD_BASE = "/dashboard/inventory/record"

/**
 * The single entry point for "open the inventory record view". Inventory has no
 * per-id page — the record view lives at `/dashboard/inventory/record` and the
 * selected item rides in the query string (`?inventoryId=…`), chosen by the
 * Warehouse → Inventory pickers in the header. Pass whatever the caller already
 * knows so those pickers seed immediately:
 *   - a list/ledger row passes `inventoryId` (+ optional `adjustment` to drill in),
 *   - a work-order passes the WO's `warehouseId` + the WO link seed
 *     (`workOrderId`/`workOrderItemId`/`productId`/labels) and lets the operator
 *     pick the inventory item there.
 * No args → the empty record view (pickers, no record).
 */
export function buildInventoryRecordHref(options?: {
  warehouseId?: string | null
  warehouseLabel?: string | null
  inventoryId?: string | null
  inventoryLabel?: string | null
  workOrderId?: string | null
  workOrderItemId?: string | null
  workOrderLabel?: string | null
  productId?: string | null
  productLabel?: string | null
  materialItemLabel?: string | null
  materialItemNotes?: string | null
  adjustment?: string | null
  returnTo?: string | null
}): string {
  const searchParams = new URLSearchParams()
  const set = (key: string, value: string | null | undefined) => {
    if (value) searchParams.set(key, value)
  }
  set("warehouseId", options?.warehouseId)
  set("warehouseLabel", options?.warehouseLabel)
  set("inventoryId", options?.inventoryId)
  set("inventoryLabel", options?.inventoryLabel)
  set("workOrderId", options?.workOrderId)
  set("workOrderItemId", options?.workOrderItemId)
  set("workOrderLabel", options?.workOrderLabel)
  set("productId", options?.productId)
  set("productLabel", options?.productLabel)
  set("materialItemLabel", options?.materialItemLabel)
  set("materialItemNotes", options?.materialItemNotes)
  set("adjustment", options?.adjustment)
  set("returnTo", options?.returnTo)

  const query = searchParams.toString()
  return query ? `${INVENTORY_RECORD_BASE}?${query}` : INVENTORY_RECORD_BASE
}

/**
 * Open an adjustment inside the inventory record view, drilled into the
 * adjustments section at that row (`?adjustment=<id>`). The single entry point
 * for "open an adjustment" — used by the adjustments ledger row click. The
 * record view resolves the row by id when it isn't on the first loaded page.
 */
export function buildInventoryAdjustmentHref(
  inventoryId: string,
  adjustmentId: string,
  returnTo?: string | null,
) {
  return buildInventoryRecordHref({ inventoryId, adjustment: adjustmentId, returnTo })
}

const INVENTORY_DUPLICATE_BASE = "/dashboard/inventory/duplicate"

/**
 * Open the "duplicate inventory" create form for a source row. Its own page
 * (mirrors the canonical `/dashboard/{module}/new` create flow) — the source
 * rides in `?sourceId=…` so the page can load it server-side for the read-only
 * reference panel. A successful create routes to the new item's record view.
 */
export function buildInventoryDuplicateHref(options: {
  sourceId: string
  returnTo?: string | null
}): string {
  const searchParams = new URLSearchParams()
  searchParams.set("sourceId", options.sourceId)
  if (options.returnTo) searchParams.set("returnTo", options.returnTo)
  return `${INVENTORY_DUPLICATE_BASE}?${searchParams.toString()}`
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
