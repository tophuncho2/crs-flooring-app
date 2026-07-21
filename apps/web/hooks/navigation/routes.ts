/**
 * The single post-login / default dashboard landing route. Referenced by the
 * Google sign-in callbackURL, the bare `/dashboard` redirect, and the
 * blocked-rank bounce so the landing target lives in exactly one place.
 */
export const DEFAULT_DASHBOARD_ROUTE = "/dashboard/home"

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

const PROPERTIES_RECORD_BASE = "/dashboard/properties/record"

/**
 * The single entry point for "open a property". A property has its own
 * standalone record view at `/dashboard/properties/record`, with the selected
 * property riding in the query string (`?propertyId=…`) — mirroring the
 * inventory record-view contract. The page resolves the property's management
 * company itself (rendered read-only with a button to the entity record view), so
 * the `entityId` arg is no longer needed for routing; it is kept in
 * the signature for call-site compatibility. Shared by every property entry
 * point (the list, the WO/template "✎ Property" buttons, the entity record view's
 * property list).
 */
export function buildPropertyRecordHref(
  propertyId: string,
  _entityId?: string | null,
  returnTo?: string | null,
) {
  const searchParams = new URLSearchParams()
  searchParams.set("propertyId", propertyId)
  if (returnTo) searchParams.set("returnTo", returnTo)
  return `${PROPERTIES_RECORD_BASE}?${searchParams.toString()}`
}

const TEMPLATE_HUB_BASE = "/dashboard/templates/edit"

/**
 * The single entry point for "open a template". Templates have no standalone
 * record page — they live on the template hub (`/dashboard/templates/edit`),
 * selected via `?templateId=`. Pass whatever the caller already knows
 * (property/entity ids + labels) so the cascade pickers seed immediately; a caller
 * with only the id is fine — the hub fills the pickers from the loaded template.
 * No args → the empty hub (the app-shell icon entry). Shared by the templates
 * list, the entity record view's templates section, a work-order's template arrow,
 * and the create-template success redirect.
 */
export function buildTemplateHubHref(options?: {
  templateId?: string | null
  templateLabel?: string | null
  propertyId?: string | null
  propertyLabel?: string | null
  entityId?: string | null
  entityLabel?: string | null
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
  set("entityId", options?.entityId)
  set("entityLabel", options?.entityLabel)
  set("returnTo", options?.returnTo)

  const query = searchParams.toString()
  return query ? `${TEMPLATE_HUB_BASE}?${query}` : TEMPLATE_HUB_BASE
}

const WORK_ORDERS_RECORD_BASE = "/dashboard/work-orders"

/**
 * The single entry point for "open a work order record". Unlike the picker-seeded
 * record views, a work order has a real `[id]` page — the selected work order rides
 * as a path param (`/dashboard/work-orders/{id}`). Pass `view` to open straight into
 * a section (e.g. `"requested"` after a template sync) and `returnTo` so the record's
 * Back button lands back where the caller came from (the page resolves it via
 * {@link resolveRecordEntryReturnTo}, falling back to the work-orders list).
 */
export function buildWorkOrderRecordHref(
  workOrderId: string,
  options?: {
    view?: string | null
    returnTo?: string | null
  },
): string {
  const searchParams = new URLSearchParams()
  if (options?.view) searchParams.set("view", options.view)
  if (options?.returnTo) searchParams.set("returnTo", options.returnTo)

  const query = searchParams.toString()
  return query
    ? `${WORK_ORDERS_RECORD_BASE}/${workOrderId}?${query}`
    : `${WORK_ORDERS_RECORD_BASE}/${workOrderId}`
}

const INVENTORY_RECORD_BASE = "/dashboard/inventory/record"

/**
 * The single entry point for "open the inventory record view". Inventory has no
 * per-id page — the record view lives at `/dashboard/inventory/record` and the
 * selected item rides in the query string (`?inventoryId=…`), chosen by the
 * Warehouse → Inventory pickers in the header. Pass whatever the caller already
 * knows so those pickers seed immediately:
 *   - a list/ledger row passes `inventoryId` (+ optional `adjustment` to drill in),
 *   - the header pickers seed `warehouseId`/`productId` (+ labels) to narrow the
 *     inventory grid.
 * No args → the empty record view (pickers, no record).
 */
export function buildInventoryRecordHref(options?: {
  warehouseId?: string | null
  warehouseLabel?: string | null
  inventoryId?: string | null
  inventoryLabel?: string | null
  productId?: string | null
  productLabel?: string | null
  adjustment?: string | null
  /**
   * One-shot intent applied to the drilled-in `adjustment` row once the record
   * view resolves it: open the Duplicate create modal or the Create Return modal
   * seeded from that row. Cleared by the record view after it fires.
   */
  action?: "duplicate" | "return" | null
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
  set("productId", options?.productId)
  set("productLabel", options?.productLabel)
  set("adjustment", options?.adjustment)
  set("action", options?.action)
  set("returnTo", options?.returnTo)

  const query = searchParams.toString()
  return query ? `${INVENTORY_RECORD_BASE}?${query}` : INVENTORY_RECORD_BASE
}

/**
 * Open an adjustment inside the inventory record view, drilled into the
 * adjustments section at that row (`?adjustment=<id>`). The single entry point
 * for "open an adjustment" — used by the adjustments ledger row click. The
 * record view resolves the row by id when it isn't on the first loaded page.
 *
 * Pass `action` to also fire a one-shot intent on that row once resolved — the
 * ledger's ⋮ "Duplicate"/"Create return" use it to open the seeded modal.
 */
export function buildInventoryAdjustmentHref(
  inventoryId: string,
  adjustmentId: string,
  returnTo?: string | null,
  action?: "duplicate" | "return" | null,
) {
  return buildInventoryRecordHref({ inventoryId, adjustment: adjustmentId, returnTo, action })
}

/**
 * Open the inventory create flow in **split-off** mode, seeded from a source
 * inventory row. Same create scaffold as new/duplicate — only the seed and the
 * blue-header label differ: the form copies the source's identity (incl. roll #)
 * and seeds Starting Stock from `quantity` (the adjustment amount split off,
 * still editable). The single entry point shared by every "Split off" trigger
 * (inventory list ⋮, adjustment-row ⋮, the adjustment edit toolbar, and the
 * "Save and split" form action).
 */
export function buildInventorySplitOffHref(options: {
  sourceInventoryId: string
  quantity: string
  returnTo?: string | null
}) {
  return buildRecordCreateHref("/dashboard/inventory", {
    returnTo: options.returnTo,
    params: { sourceId: options.sourceInventoryId, mode: "split-off", qty: options.quantity },
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
