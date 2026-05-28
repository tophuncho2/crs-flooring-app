import { db } from "../../client.js"
import type { Prisma } from "../../generated/prisma/client.js"
import {
  normalizeWorkOrder,
  normalizeWorkOrderListRow,
  normalizeWorkOrderOption,
  type WorkOrderDetail,
  type WorkOrderFileGenerationInput,
  type WorkOrderFileMaterialItemProjection,
  type WorkOrderListRow,
  type WorkOrderOption,
} from "@builders/domain"
import {
  workOrderDetailSelect,
  workOrderListSelect,
  type WorkOrdersDbClient,
} from "./shared.js"

export type WorkOrdersListSort = {
  /** Primary sort column. `createdAt` (the default) falls through to the
   * tiebreaker; `scheduledFor` is ordered explicitly with nulls last. */
  field?: string
  direction: "asc" | "desc"
  groupByKeys: string[]
  isGroupingEnabled: boolean
}

/**
 * Multi-value filter map keyed by domain field. Each ID filter is a
 * multi-value array (currently single-element in the UI; multi-value
 * preserves the upgrade path).
 */
export type WorkOrdersListFilterMap = {
  managementCompanyId?: string[]
  propertyId?: string[]
  templateId?: string[]
  warehouseId?: string[]
  /**
   * Inclusive `scheduledFor` lower / upper bound as `YYYY-MM-DD` (single-element
   * array, matching the multi-value filter contract). Compared UTC-pinned to
   * match how the date-only `@db.Date` column is stored and displayed.
   */
  scheduledForStart?: string[]
  scheduledForEnd?: string[]
}

export type WorkOrdersListArgs = {
  searchQuery?: string
  sort?: WorkOrdersListSort
  filters?: WorkOrdersListFilterMap
  pagination?: { skip: number; take: number }
}

function buildWorkOrdersWhere(
  searchQuery: string | undefined,
  filters: WorkOrdersListFilterMap | undefined,
): Prisma.FlooringWorkOrderWhereInput | undefined {
  const andClauses: Prisma.FlooringWorkOrderWhereInput[] = []

  if (searchQuery) {
    andClauses.push({
      OR: [
        { unitType: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
        { property: { name: { contains: searchQuery, mode: "insensitive" } } },
        { jobType: { name: { contains: searchQuery, mode: "insensitive" } } },
      ],
    })
  }

  if (filters?.managementCompanyId?.length) {
    andClauses.push({ managementCompanyId: { in: filters.managementCompanyId } })
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

function buildWorkOrdersOrderBy(
  sort: WorkOrdersListSort | undefined,
): Prisma.FlooringWorkOrderOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = sort?.direction ?? "asc"
  const orderBy: Prisma.FlooringWorkOrderOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.FlooringWorkOrderOrderByWithRelationInput> = {
    workOrderNumber: { workOrderNumber: direction },
    property: { property: { name: direction } },
    managementCompany: { managementCompany: { name: direction } },
    jobType: { jobType: { name: direction } },
    warehouse: { warehouse: { name: direction } },
    scheduledFor: { scheduledFor: direction },
    unitNumber: { unitNumber: direction },
    unitType: { unitType: direction },
    status: { status: { name: direction } },
  }

  if (sort?.isGroupingEnabled) {
    for (const groupKey of sort.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  // Primary user-selected sort field. `createdAt` is the default and is covered
  // by the tiebreaker append below; `scheduledFor` is nullable, so order it
  // explicitly with nulls last in both directions.
  if (sort?.field === "scheduledFor") {
    appendUniqueOrderBy(orderBy, { scheduledFor: { sort: direction, nulls: "last" } })
  }

  appendUniqueOrderBy(orderBy, { createdAt: direction })
  appendUniqueOrderBy(orderBy, { id: direction })

  return orderBy
}

export async function listWorkOrders(
  args: WorkOrdersListArgs,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderListRow[]> {
  const workOrders = await client.flooringWorkOrder.findMany({
    where: buildWorkOrdersWhere(args.searchQuery, args.filters),
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
 * Async-picker search: warehouse-scoped work-order options for the cut-log
 * relink dropdown. Filters by `warehouseId` (required), excludes work orders
 * with the "complete" status, and matches `unitType` or `description` via
 * ILIKE on the optional search term. Takes a bounded count to keep the
 * dropdown responsive.
 */
export type SearchWorkOrderOptionsInput = {
  warehouseId: string
  search?: string
  /**
   * When set, only return work orders that already carry a material item for
   * this product. Powers the cut-log relink picker: the cut log's product is
   * fixed, and `@@unique([workOrderId, productId])` makes the matching WOMI
   * deterministic, so the picker only offers WOs that can actually be linked.
   */
  productId?: string
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
      warehouseId: input.warehouseId,
      status: { isNot: { slug: "complete" } },
      ...(input.productId
        ? { items: { some: { productId: input.productId } } }
        : {}),
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

export async function getWorkOrderDetailById(
  id: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderDetail> {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id },
    select: workOrderDetailSelect,
  })

  return normalizeWorkOrder(workOrder)
}

export async function countWorkOrders(
  args: { searchQuery?: string; filters?: WorkOrdersListFilterMap },
  client: WorkOrdersDbClient = db,
): Promise<number> {
  return client.flooringWorkOrder.count({
    where: buildWorkOrdersWhere(args.searchQuery, args.filters),
  })
}

/**
 * Counts non-void cut logs linked to this work order. Used by the
 * application-layer warehouse-change-lock predicate
 * (`assertWorkOrderWarehouseChangeAllowed`).
 */
export async function countWorkOrderCutLogs(
  workOrderId: string,
  client: WorkOrdersDbClient = db,
): Promise<number> {
  return client.flooringCutLog.count({
    where: {
      workOrderId,
      void: false,
    },
  })
}

/**
 * Joined read shape consumed by the on-demand print views (Work Order
 * Slip / Picking Ticket). Returns the data already projected to
 * `WorkOrderFileGenerationInput` so the page loader can hand it straight
 * to `buildWorkOrderSlipHtml` / `buildWorkOrderPickingTicketHtml` from
 * the domain layer.
 *
 * Inventory identity + unit fields on each cut log are read from the
 * cut log row's snapshot columns rather than the joined inventory or
 * product row, so the printed document reflects the values captured at
 * cut time. This read runs at request time when a print view is opened.
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
      scheduledFor: true,
      unitNumber: true,
      unitType: true,
      customAddress: true,
      description: true,
      installerInstructions: true,
      property: {
        select: {
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
          instructions: true,
        },
      },
      managementCompany: { select: { name: true } },
      warehouse: { select: { name: true } },
      jobType: { select: { name: true } },
      items: {
        orderBy: { createdAt: "asc" as const },
        select: {
          id: true,
          quantity: true,
          sendUnitAbbrev: true,
          notes: true,
          product: {
            select: {
              name: true,
            },
          },
          cutLogs: {
            // isFinal + finalCutSequence drive the order but are not in the
            // projection; Prisma supports orderBy on non-selected columns.
            orderBy: [
              { isFinal: "asc" as const },
              { finalCutSequence: "asc" as const },
              { createdAt: "asc" as const },
            ],
            select: {
              id: true,
              cutLogNumber: true,
              before: true,
              cut: true,
              after: true,
              coverageCut: true,
              isWaste: true,
              notes: true,
              inventoryItem: true,
              location: true,
              stockUnitAbbrev: true,
              itemCoverageUnitAbbrev: true,
            },
          },
        },
      },
    },
  })

  const materialItems: WorkOrderFileMaterialItemProjection[] = workOrder.items.map((item) => ({
    id: item.id,
    productName: item.product.name,
    quantity: item.quantity == null ? "" : item.quantity.toString(),
    sendUnitAbbrev: item.sendUnitAbbrev ?? "",
    notes: item.notes ?? "",
    cutLogs: item.cutLogs.map((cl) => ({
      id: cl.id,
      cutLogNumber: cl.cutLogNumber,
      before: cl.before === null ? "" : cl.before.toString(),
      cut: cl.cut.toString(),
      after: cl.after === null ? "" : cl.after.toString(),
      coverageCut: cl.coverageCut === null ? "" : cl.coverageCut.toString(),
      isWaste: cl.isWaste,
      notes: cl.notes ?? "",
      inventoryItem: cl.inventoryItem,
      location: cl.location ?? "",
      stockUnitAbbrev: cl.stockUnitAbbrev ?? "",
      itemCoverageUnitAbbrev: cl.itemCoverageUnitAbbrev ?? "",
    })),
  }))

  return {
    workOrderNumber: workOrder.workOrderNumber,
    scheduledFor: workOrder.scheduledFor === null ? "" : workOrder.scheduledFor.toISOString().slice(0, 10),
    vacancy: workOrder.vacancy,
    unitNumber: workOrder.unitNumber ?? "",
    unitType: workOrder.unitType ?? "",
    customAddress: workOrder.customAddress ?? "",
    description: workOrder.description ?? "",
    installerInstructions: workOrder.installerInstructions ?? "",
    property: {
      name: workOrder.property.name,
      streetAddress: workOrder.property.streetAddress ?? "",
      city: workOrder.property.city ?? "",
      state: workOrder.property.state ?? "",
      postalCode: workOrder.property.postalCode ?? "",
      instructions: workOrder.property.instructions ?? "",
    },
    managementCompanyName: workOrder.managementCompany?.name ?? "",
    warehouseName: workOrder.warehouse?.name ?? "",
    jobTypeName: workOrder.jobType?.name ?? "",
    materialItems,
  }
}
