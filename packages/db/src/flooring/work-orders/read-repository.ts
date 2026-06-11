import { db } from "../../client.js"
import type { FlooringVacancyStatus, Prisma } from "../../generated/prisma/client.js"
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
  jobTypeId?: string[]
  /**
   * Per-column identity search — the list-view search bars. Each is an
   * independent case-insensitive substring (ILIKE) match against its own
   * column; single-element arrays matching the multi-value filter contract,
   * and multiple set fields AND together to narrow.
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
  statusId?: string[]
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
  const workOrderNumber = filters?.workOrderNumber?.[0]
  if (workOrderNumber) {
    andClauses.push({ workOrderNumber: { contains: workOrderNumber, mode: "insensitive" } })
  }
  const description = filters?.description?.[0]
  if (description) {
    andClauses.push({ description: { contains: description, mode: "insensitive" } })
  }

  if (filters?.managementCompanyId?.length) {
    andClauses.push({ property: { managementCompanyId: { in: filters.managementCompanyId } } })
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
  if (filters?.statusId?.length) {
    andClauses.push({ statusId: { in: filters.statusId } })
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
    managementCompany: { property: { managementCompany: { name: direction } } },
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
  // explicitly with nulls last in both directions. The remaining relation/scalar
  // fields (workOrderNumber, property, managementCompany) reuse `fieldMap` so the
  // ordering shape stays a single source of truth.
  if (sort?.field === "scheduledFor") {
    appendUniqueOrderBy(orderBy, { scheduledFor: { sort: direction, nulls: "last" } })
  } else if (sort?.field && fieldMap[sort.field]) {
    appendUniqueOrderBy(orderBy, fieldMap[sort.field])
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
    where: buildWorkOrdersWhere(args.filters),
    orderBy: buildWorkOrdersOrderBy(args.sort),
    select: workOrderListSelect,
    ...(args.pagination ?? {}),
  })

  return workOrders.map(normalizeWorkOrderListRow)
}

export type WorkOrdersForContactPageOptions = {
  contactId: string
  skip: number
  take: number
}

/**
 * Paginated read of one contact's work orders for the contact record-view
 * Statistics section. A work order belongs to the contact when it has at least
 * one labor payment for that contact (the `some` relation filter dedupes at the
 * work-order level). Rows reuse `workOrderListSelect` + `normalizeWorkOrderListRow`
 * so they are identical to the work-order list view.
 */
export async function listWorkOrdersForContactPage(
  options: WorkOrdersForContactPageOptions,
  client: WorkOrdersDbClient = db,
): Promise<{ rows: WorkOrderListRow[]; total: number }> {
  const where: Prisma.FlooringWorkOrderWhereInput = {
    laborPayments: { some: { contactId: options.contactId } },
  }

  const [total, rows] = await Promise.all([
    client.flooringWorkOrder.count({ where }),
    client.flooringWorkOrder.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: workOrderListSelect,
      skip: options.skip,
      take: options.take,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeWorkOrderListRow),
  }
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
          managementCompany: { select: { name: true } },
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
          inventoryAdjustments: {
            // Print views show only WO-linked DEDUCTION adjustments; INCREASE
            // rows never have a WO link, so they're naturally excluded. The
            // explicit filter is belt-and-braces.
            where: { adjustmentType: "DEDUCTION" as const },
            // Within each product (parent item) the rows run quantity-ascending,
            // with id as a deterministic tiebreaker. Both keys are in the select.
            orderBy: [
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
    inventoryAdjustments: item.inventoryAdjustments.map((adj) => ({
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
    })),
  }))

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
      name: workOrder.property.name,
      streetAddress: workOrder.property.streetAddress ?? "",
      city: workOrder.property.city ?? "",
      state: workOrder.property.state ?? "",
      postalCode: workOrder.property.postalCode ?? "",
      instructions: workOrder.property.instructions ?? "",
    },
    managementCompanyName: workOrder.property.managementCompany?.name ?? "",
    warehouse: {
      name: workOrder.warehouse?.name ?? "",
      streetAddress: workOrder.warehouse?.streetAddress ?? "",
      city: workOrder.warehouse?.city ?? "",
      state: workOrder.warehouse?.state ?? "",
      postalCode: workOrder.warehouse?.postalCode ?? "",
      phone: workOrder.warehouse?.phone ?? "",
    },
    jobTypeName: workOrder.jobType?.name ?? "",
    materialItems,
  }
}
