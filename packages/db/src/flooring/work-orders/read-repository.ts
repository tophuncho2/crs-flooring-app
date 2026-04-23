import { db } from "../../client.js"
import type { Prisma } from "@prisma/client"
import {
  normalizeWorkOrder,
  normalizeWorkOrderListRow,
  normalizeWorkOrderOption,
  type WorkOrderDetail,
  type WorkOrderListRow,
  type WorkOrderOption,
} from "@builders/domain"
import {
  workOrderDetailSelect,
  workOrderRowSelect,
  type WorkOrdersDbClient,
} from "./shared.js"

export type WorkOrdersListSort = {
  direction: "asc" | "desc"
  groupByKeys: string[]
  isGroupingEnabled: boolean
}

export type WorkOrdersListArgs = {
  searchQuery?: string
  sort?: WorkOrdersListSort
  pagination?: { skip: number; take: number }
}

function buildWorkOrdersWhere(
  searchQuery: string | undefined,
): Prisma.FlooringWorkOrderWhereInput | undefined {
  if (!searchQuery) return undefined

  return {
    OR: [
      { workOrderNumber: { contains: searchQuery, mode: "insensitive" } },
      { unitNumber: { contains: searchQuery, mode: "insensitive" } },
      { unitType: { contains: searchQuery, mode: "insensitive" } },
      { customAddress: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
      { property: { name: { contains: searchQuery, mode: "insensitive" } } },
      { managementCompany: { name: { contains: searchQuery, mode: "insensitive" } } },
      { jobType: { name: { contains: searchQuery, mode: "insensitive" } } },
      { template: { templateNumber: { contains: searchQuery, mode: "insensitive" } } },
      { warehouse: { name: { contains: searchQuery, mode: "insensitive" } } },
    ],
  }
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
    where: buildWorkOrdersWhere(args.searchQuery),
    orderBy: buildWorkOrdersOrderBy(args.sort),
    select: workOrderRowSelect,
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
): Promise<WorkOrderDetail> {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id },
    select: workOrderDetailSelect,
  })

  return normalizeWorkOrder(workOrder)
}

export async function countWorkOrders(
  args: { searchQuery?: string },
  client: WorkOrdersDbClient = db,
): Promise<number> {
  return client.flooringWorkOrder.count({
    where: buildWorkOrdersWhere(args.searchQuery),
  })
}
