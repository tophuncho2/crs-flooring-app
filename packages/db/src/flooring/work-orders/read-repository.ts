import { db } from "../../client.js"
import type { Prisma } from "@prisma/client"
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
  direction: "asc" | "desc"
  groupByKeys: string[]
  isGroupingEnabled: boolean
}

/**
 * Multi-value filter map keyed by domain field. Each ID filter is a
 * multi-value array (currently single-element in the UI; multi-value
 * preserves the upgrade path). `isComplete` is a single-element enum:
 * absent | `["hide"]` → `isComplete: false`, `["only"]` →
 * `isComplete: true`, `["all"]` → omit the clause.
 */
export type WorkOrdersListFilterMap = {
  managementCompanyId?: string[]
  propertyId?: string[]
  templateId?: string[]
  warehouseId?: string[]
  isComplete?: string[]
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
        { workOrderNumber: { contains: searchQuery, mode: "insensitive" } },
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

  const completeMode = filters?.isComplete?.[0]
  if (completeMode === "only") {
    andClauses.push({ isComplete: true })
  } else if (completeMode !== "all") {
    andClauses.push({ isComplete: false })
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
    status: { status: direction },
    isComplete: { isComplete: direction },
  }

  if (sort?.isGroupingEnabled) {
    for (const groupKey of sort.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { workOrderNumber: direction })

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

export async function listWorkOrderOptions(
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderOption[]> {
  const workOrders = await client.flooringWorkOrder.findMany({
    orderBy: { workOrderNumber: "asc" },
    select: { id: true, workOrderNumber: true },
  })

  return workOrders.map(normalizeWorkOrderOption)
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
 * Joined read shape consumed by the file-generation worker. Returns the
 * data already projected to `WorkOrderFileGenerationInput` so the worker
 * can hand it straight to `buildWorkOrderPdfHtml` from the domain layer.
 *
 * Inventory identity + unit fields on each cut log are read from the
 * cut log row's snapshot columns rather than the joined inventory or
 * product row. The PDF artifact in the bucket IS the snapshot per
 * locked decision; this read runs at worker time.
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
      template: { select: { templateNumber: true } },
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
    quantity: item.quantity.toString(),
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
    templateNumber: workOrder.template?.templateNumber ?? "",
    materialItems,
  }
}
