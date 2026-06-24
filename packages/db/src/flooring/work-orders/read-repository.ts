import { db } from "../../client.js"
import type { FlooringVacancyStatus, Prisma } from "../../generated/prisma/client.js"
import { numberNeighborQueries } from "../../shared/number-neighbors.js"
import {
  buildFlooringProductDisplayName,
  normalizeWorkOrder,
  normalizeWorkOrderListRow,
  normalizeWorkOrderOption,
  type WorkOrderDetail,
  type WorkOrderFileGenerationInput,
  type WorkOrderFileProductAdjustmentGroup,
  type WorkOrderFileProductMaterialItemGroup,
  type WorkOrderListRow,
  type WorkOrderNeighbor,
  type WorkOrderOption,
} from "@builders/domain"
import {
  workOrderDetailSelect,
  workOrderListSelect,
  type WorkOrdersDbClient,
} from "./shared.js"

export type WorkOrdersListSortEntry = {
  /** Sort column. `scheduledFor` is nullable and ordered with nulls last;
   * every other field maps through `workOrderFieldOrderBy`. */
  field: string
  direction: "asc" | "desc"
}

export type WorkOrdersListSort = {
  /** Ordered sort columns, highest priority first. An empty list falls straight
   * through to the `createdAt`+`id` tiebreaker (the default newest-first order). */
  entries: WorkOrdersListSortEntry[]
}

/**
 * Multi-value filter map keyed by domain field. Each ID filter is a
 * multi-value array (currently single-element in the UI; multi-value
 * preserves the upgrade path).
 */
export type WorkOrdersListFilterMap = {
  entityId?: string[]
  propertyId?: string[]
  templateId?: string[]
  warehouseId?: string[]
  jobTypeId?: string[]
  /**
   * Per-column identity search — the list-view search bars. `unitType`,
   * `unitNumber`, and `description` are case-insensitive substring (ILIKE)
   * matches against their own column. `workOrderNumber` is the exception: it is
   * an EXACT match on the numeric value (see `buildWorkOrdersWhere`) so the #
   * bar lands the one row. Single-element arrays matching the multi-value filter
   * contract; multiple set fields AND together to narrow.
   */
  unitType?: string[]
  unitNumber?: string[]
  workOrderNumber?: string[]
  description?: string[]
  // Vacancy enum filter — single-element array of `VACANT` / `OCCUPIED`.
  vacancy?: string[]
  /**
   * Inclusive `scheduledFor` lower / upper bound as `YYYY-MM-DD` (single-element
   * array, matching the multi-value filter contract). Compared UTC-pinned to
   * match how the date-only `@db.Date` column is stored and displayed.
   */
  scheduledForStart?: string[]
  scheduledForEnd?: string[]
}

export type WorkOrdersListArgs = {
  sort?: WorkOrdersListSort
  filters?: WorkOrdersListFilterMap
  pagination?: { skip: number; take: number }
}

function buildWorkOrdersWhere(
  filters: WorkOrdersListFilterMap | undefined,
): Prisma.FlooringWorkOrderWhereInput | undefined {
  const andClauses: Prisma.FlooringWorkOrderWhereInput[] = []

  // Per-column identity search — one independent ILIKE per filled search bar.
  const unitType = filters?.unitType?.[0]
  if (unitType) {
    andClauses.push({ unitType: { contains: unitType, mode: "insensitive" } })
  }
  const unitNumber = filters?.unitNumber?.[0]
  if (unitNumber) {
    andClauses.push({ unitNumber: { contains: unitNumber, mode: "insensitive" } })
  }
  // Work-order number search is an EXACT match on the numeric value — the # bar
  // finds the one row, so "12" matches WO-12 only, never WO-120 / WO-312. We
  // match the generated integer column `workOrderNumberInt` (btree-indexed),
  // which also lets the user type bare ("12") or prefixed ("WO-12") — non-digits
  // are stripped. A non-numeric query matches nothing (sentinel -1; the
  // work-order-number sequence is always positive).
  const workOrderNumberRaw = filters?.workOrderNumber?.[0]
  if (workOrderNumberRaw) {
    const digits = workOrderNumberRaw.replace(/\D/g, "")
    const parsed = digits.length > 0 ? Number.parseInt(digits, 10) : Number.NaN
    andClauses.push({ workOrderNumberInt: { equals: Number.isInteger(parsed) ? parsed : -1 } })
  }
  const description = filters?.description?.[0]
  if (description) {
    andClauses.push({ description: { contains: description, mode: "insensitive" } })
  }

  if (filters?.entityId?.length) {
    andClauses.push({ property: { entityId: { in: filters.entityId } } })
  }
  if (filters?.propertyId?.length) {
    andClauses.push({ propertyId: { in: filters.propertyId } })
  }
  if (filters?.templateId?.length) {
    andClauses.push({ templateId: { in: filters.templateId } })
  }
  if (filters?.warehouseId?.length) {
    andClauses.push({ warehouseId: { in: filters.warehouseId } })
  }
  if (filters?.jobTypeId?.length) {
    andClauses.push({ jobTypeId: { in: filters.jobTypeId } })
  }
  if (filters?.vacancy?.length) {
    andClauses.push({ vacancy: { in: filters.vacancy as FlooringVacancyStatus[] } })
  }

  // scheduledFor date range. `@db.Date` values are stored UTC-midnight, so the
  // picked `YYYY-MM-DD` bounds are pinned to UTC midnight too: an inclusive
  // `lte` on the end day matches without end-of-day math, and a null
  // scheduledFor naturally drops out when any bound is set.
  const scheduledStart = filters?.scheduledForStart?.[0]
  const scheduledEnd = filters?.scheduledForEnd?.[0]
  if (scheduledStart || scheduledEnd) {
    const range: Prisma.DateTimeNullableFilter = {}
    const start = scheduledStart ? new Date(`${scheduledStart}T00:00:00.000Z`) : null
    const end = scheduledEnd ? new Date(`${scheduledEnd}T00:00:00.000Z`) : null
    if (start && !Number.isNaN(start.getTime())) range.gte = start
    if (end && !Number.isNaN(end.getTime())) range.lte = end
    if (range.gte || range.lte) andClauses.push({ scheduledFor: range })
  }

  if (andClauses.length === 0) return undefined
  if (andClauses.length === 1) return andClauses[0]
  return { AND: andClauses }
}

function appendUniqueOrderBy<T>(values: T[], nextValue: T | null | undefined) {
  if (!nextValue) return
  const serialized = JSON.stringify(nextValue)
  if (values.some((value) => JSON.stringify(value) === serialized)) return
  values.push(nextValue)
}

// Single source of truth for how each sortable field maps to a Prisma orderBy
// clause. `scheduledFor` is nullable, so it is ordered explicitly with nulls
// last in both directions; everything else is a plain relation/scalar sort.
// Returns `undefined` for unknown fields so the caller can skip them.
function workOrderFieldOrderBy(
  field: string,
  direction: Prisma.SortOrder,
): Prisma.FlooringWorkOrderOrderByWithRelationInput | undefined {
  switch (field) {
    case "scheduledFor":
      return { scheduledFor: { sort: direction, nulls: "last" } }
    case "workOrderNumber":
      return { workOrderNumber: direction }
    case "property":
      return { property: { name: direction } }
    case "entity":
      return { property: { entity: { entity: direction } } }
    case "jobType":
      return { jobType: { name: direction } }
    case "warehouse":
      return { warehouse: { name: direction } }
    case "unitNumber":
      return { unitNumber: direction }
    case "unitType":
      return { unitType: direction }
    default:
      return undefined
  }
}

function buildWorkOrdersOrderBy(
  sort: WorkOrdersListSort | undefined,
): Prisma.FlooringWorkOrderOrderByWithRelationInput[] {
  const entries = sort?.entries ?? []
  const orderBy: Prisma.FlooringWorkOrderOrderByWithRelationInput[] = []

  // Apply the user-selected columns in priority order. Each is appended via
  // `appendUniqueOrderBy`, so a repeated field (or one colliding with the
  // tiebreak) collapses to its first occurrence. `createdAt` is intentionally
  // not in the field map — it is the default and is covered by the tiebreak.
  for (const entry of entries) {
    appendUniqueOrderBy(orderBy, workOrderFieldOrderBy(entry.field, entry.direction))
  }

  // Deterministic tiebreak. Its direction mirrors the highest-priority entry so
  // the trailing `createdAt` order matches the leading column; with no entries
  // it falls back to `asc` (the createdAt-desc default is applied upstream).
  const tiebreakDirection: Prisma.SortOrder = entries[0]?.direction ?? "asc"
  appendUniqueOrderBy(orderBy, { createdAt: tiebreakDirection })
  appendUniqueOrderBy(orderBy, { id: tiebreakDirection })

  return orderBy
}

export async function listWorkOrders(
  args: WorkOrdersListArgs,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderListRow[]> {
  const workOrders = await client.flooringWorkOrder.findMany({
    where: buildWorkOrdersWhere(args.filters),
    orderBy: buildWorkOrdersOrderBy(args.sort),
    select: workOrderListSelect,
    ...(args.pagination ?? {}),
  })

  return workOrders.map(normalizeWorkOrderListRow)
}

const workOrderOptionSelect = {
  id: true,
  workOrderNumber: true,
  property: { select: { name: true } },
  unitType: true,
  unitNumber: true,
  description: true,
} as const

export async function listWorkOrderOptions(
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderOption[]> {
  const workOrders = await client.flooringWorkOrder.findMany({
    orderBy: { createdAt: "desc" },
    select: workOrderOptionSelect,
  })

  return workOrders.map(normalizeWorkOrderOption)
}

/**
 * Async-picker search: work-order options for the cut-log relink dropdown.
 * Not warehouse-scoped — adjustments cross-source inventory across warehouses,
 * so the picker offers WOs from any warehouse, regardless of status (completed
 * WOs included). Matches `unitType` or `description` via ILIKE on the optional
 * search term. Takes a bounded count to keep the dropdown responsive.
 */
export type SearchWorkOrderOptionsInput = {
  search?: string
  skip?: number
  take?: number
}

export type WorkOrderOptionsSearchResult = {
  items: WorkOrderOption[]
  hasMore: boolean
}

export async function searchWorkOrderOptions(
  input: SearchWorkOrderOptionsInput,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderOptionsSearchResult> {
  const search = input.search?.trim() ?? ""
  const take = input.take ?? 20
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  // Fetch take+1 to detect a next page without a separate count query.
  const workOrders = await client.flooringWorkOrder.findMany({
    where: {
      ...(search.length > 0
        ? {
            OR: [
              { unitType: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: workOrderOptionSelect,
    skip,
    take: take + 1,
  })

  const hasMore = workOrders.length > take
  const page = hasMore ? workOrders.slice(0, take) : workOrders
  return { items: page.map(normalizeWorkOrderOption), hasMore }
}

export async function getWorkOrderById(
  id: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderListRow> {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id },
    select: workOrderListSelect,
  })

  return normalizeWorkOrderListRow(workOrder)
}

type WorkOrderNeighbors = {
  previousWorkOrder: WorkOrderNeighbor | null
  nextWorkOrder: WorkOrderNeighbor | null
}

const NO_WORK_ORDER_NEIGHBORS: WorkOrderNeighbors = {
  previousWorkOrder: null,
  nextWorkOrder: null,
}

/**
 * Resolve the work-order rows immediately before/after the given numeric sort
 * key in the global work-order-number order (`workOrderNumberInt`). Powers the
 * record-view shell stepper — deliberately global: no property / status / date
 * scoping, the stepper walks the raw number line. Two single-row lookups on the
 * `workOrderNumberInt` index. Both null when the key is null (no generated value
 * yet) or the row is at the sequence's edge.
 */
async function getWorkOrderNeighbors(
  workOrderNumberInt: number | null,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderNeighbors> {
  if (workOrderNumberInt === null) return NO_WORK_ORDER_NEIGHBORS

  const { previous: previousQuery, next: nextQuery } = numberNeighborQueries(
    "workOrderNumberInt",
    workOrderNumberInt,
  )
  const [previous, next] = await Promise.all([
    client.flooringWorkOrder.findFirst({
      ...previousQuery,
      select: { id: true },
    }),
    client.flooringWorkOrder.findFirst({
      ...nextQuery,
      select: { id: true },
    }),
  ])

  return {
    previousWorkOrder: previous ? { id: previous.id } : null,
    nextWorkOrder: next ? { id: next.id } : null,
  }
}

/**
 * Read the full work-order detail. By default it also resolves the adjacent
 * rows for the record-view shell stepper; pass `{ withNeighbors: false }` on
 * paths that only read a snapshot (e.g. the delete conflict check) to skip the
 * two extra lookups.
 */
export async function getWorkOrderDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderDetail> {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id },
    select: workOrderDetailSelect,
  })

  const neighbors =
    options.withNeighbors === false
      ? NO_WORK_ORDER_NEIGHBORS
      : await getWorkOrderNeighbors(workOrder.workOrderNumberInt, client)

  return normalizeWorkOrder(workOrder, neighbors)
}

export async function countWorkOrders(
  args: { filters?: WorkOrdersListFilterMap },
  client: WorkOrdersDbClient = db,
): Promise<number> {
  return client.flooringWorkOrder.count({
    where: buildWorkOrdersWhere(args.filters),
  })
}

/**
 * Joined read shape consumed by the on-demand print views (Work Order
 * Slip / Picking Ticket). Returns the data already projected to
 * `WorkOrderFileGenerationInput` so the page loader can hand it straight
 * to `buildWorkOrderSlipHtml` / `buildWorkOrderPickingTicketHtml` from
 * the domain layer.
 *
 * Inventory identity + unit fields on each adjustment are read from the
 * adjustment row's snapshot columns rather than the joined inventory or
 * product row, so the printed document reflects the values captured at
 * adjustment time. This read runs at request time when a print view is
 * opened.
 */
export async function getWorkOrderForFileGeneration(
  workOrderId: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderFileGenerationInput> {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id: workOrderId },
    select: {
      workOrderNumber: true,
      vacancy: true,
      timeOfDay: true,
      scheduledFor: true,
      unitNumber: true,
      unitType: true,
      customAddress: true,
      description: true,
      installerInstructions: true,
      property: {
        select: {
          name: true,
          entity: { select: { entity: true } },
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
          instructions: true,
        },
      },
      warehouse: {
        select: {
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
          phone: true,
        },
      },
      jobType: { select: { name: true } },
    },
  })

  // Adjustments link to the work order (any product), not to a material item,
  // so the print groups the WO's DEDUCTION adjustments by their own product
  // snapshot. INCREASE rows never surface (explicit filter, belt-and-braces).
  // Order by `productId` first so same-product rows are strictly contiguous —
  // two distinct products that share a bare name can no longer interleave and
  // split a block. Within a product, quantity-ascending with id as a tiebreak.
  const adjustments = await client.flooringInventoryAdjustment.findMany({
    where: { workOrderId, adjustmentType: "DEDUCTION" as const },
    orderBy: [
      { productId: "asc" as const },
      { quantity: "asc" as const },
      { id: "asc" as const },
    ],
    select: {
      id: true,
      adjustmentNumber: true,
      before: true,
      quantity: true,
      after: true,
      isWaste: true,
      notes: true,
      dyeLot: true,
      rollNumber: true,
      location: true,
      stockUnitAbbrev: true,
      productId: true,
      product: { select: { name: true, style: true, color: true } },
    },
  })

  // Group the productId-ordered rows into product blocks (single pass; the order
  // guarantees contiguity). Label each group with the COMPOSED display name
  // (name + style + color) so the printed product header matches the WO record
  // grid, then sort the groups by that label — mirroring the grid's groupByProduct.
  const adjustmentGroups: WorkOrderFileProductAdjustmentGroup[] = []
  let currentProductId: string | null = null
  for (const adj of adjustments) {
    const projection = {
      id: adj.id,
      adjustmentNumber: adj.adjustmentNumber,
      before: adj.before === null ? "" : adj.before.toString(),
      quantity: adj.quantity.toString(),
      after: adj.after === null ? "" : adj.after.toString(),
      isWaste: adj.isWaste,
      notes: adj.notes ?? "",
      dyeLot: adj.dyeLot ?? "",
      rollNumber: adj.rollNumber ?? "",
      location: adj.location ?? "",
      stockUnitAbbrev: adj.stockUnitAbbrev ?? "",
    }
    if (adj.productId !== currentProductId) {
      currentProductId = adj.productId
      const productName = buildFlooringProductDisplayName({
        name: adj.product.name,
        style: adj.product.style,
        color: adj.product.color,
      })
      adjustmentGroups.push({ productName, adjustments: [projection] })
    } else {
      adjustmentGroups[adjustmentGroups.length - 1]!.adjustments.push(projection)
    }
  }
  adjustmentGroups.sort((a, b) => a.productName.localeCompare(b.productName))

  // Requested material items — every item on the WO (no status filter), grouped
  // by product exactly like the adjustments above: productId-ordered for strict
  // contiguity, quantity-ascending with id tiebreak, single-pass blocks labeled
  // with the composed display name, groups sorted by that label.
  const materialItems = await client.flooringWorkOrderItem.findMany({
    where: { workOrderId },
    orderBy: [
      { productId: "asc" as const },
      { quantity: "asc" as const },
      { id: "asc" as const },
    ],
    select: {
      id: true,
      quantity: true,
      sendUnitAbbrev: true,
      notes: true,
      productId: true,
      product: { select: { name: true, style: true, color: true } },
    },
  })

  const materialItemGroups: WorkOrderFileProductMaterialItemGroup[] = []
  let currentMaterialProductId: string | null = null
  for (const item of materialItems) {
    const projection = {
      id: item.id,
      quantity: item.quantity === null ? "" : item.quantity.toString(),
      unitAbbrev: item.sendUnitAbbrev ?? "",
      notes: item.notes ?? "",
    }
    if (item.productId !== currentMaterialProductId) {
      currentMaterialProductId = item.productId
      const productName = buildFlooringProductDisplayName({
        name: item.product.name,
        style: item.product.style,
        color: item.product.color,
      })
      materialItemGroups.push({ productName, materialItems: [projection] })
    } else {
      materialItemGroups[materialItemGroups.length - 1]!.materialItems.push(projection)
    }
  }
  materialItemGroups.sort((a, b) => a.productName.localeCompare(b.productName))

  return {
    workOrderNumber: workOrder.workOrderNumber,
    scheduledFor: workOrder.scheduledFor === null ? "" : workOrder.scheduledFor.toISOString().slice(0, 10),
    vacancy: workOrder.vacancy,
    timeOfDay: workOrder.timeOfDay,
    unitNumber: workOrder.unitNumber ?? "",
    unitType: workOrder.unitType ?? "",
    customAddress: workOrder.customAddress ?? "",
    description: workOrder.description ?? "",
    installerInstructions: workOrder.installerInstructions ?? "",
    property: {
      name: workOrder.property?.name ?? "",
      streetAddress: workOrder.property?.streetAddress ?? "",
      city: workOrder.property?.city ?? "",
      state: workOrder.property?.state ?? "",
      postalCode: workOrder.property?.postalCode ?? "",
      instructions: workOrder.property?.instructions ?? "",
    },
    entityName: workOrder.property?.entity?.entity ?? "",
    warehouse: {
      name: workOrder.warehouse?.name ?? "",
      streetAddress: workOrder.warehouse?.streetAddress ?? "",
      city: workOrder.warehouse?.city ?? "",
      state: workOrder.warehouse?.state ?? "",
      postalCode: workOrder.warehouse?.postalCode ?? "",
      phone: workOrder.warehouse?.phone ?? "",
    },
    jobTypeName: workOrder.jobType?.name ?? "",
    adjustmentGroups,
    materialItemGroups,
  }
}
