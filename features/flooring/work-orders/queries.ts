import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { createPrismaPageLoadIssue, isPrismaNotFoundError, withPrismaConnectivityHandling, type PrismaDetailPageResult } from "@/server/db/prisma-errors"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { loadSharedRecordDetailOptions } from "@/features/flooring/shared/record-page/record-detail-options"
import { listSalesRepContactOptions } from "@/features/flooring/contacts/data/queries"
import { normalizeWorkOrder, normalizeWorkOrderExpenseTotals, normalizeWorkOrderItem, normalizeWorkOrderSalesRep, normalizeWorkOrderServiceItem, normalizeWorkOrderSummary } from "./services"

type WorkOrderDbClient = Prisma.TransactionClient | typeof prisma

function buildWorkOrderWhere(searchQuery: string): Prisma.FlooringWorkOrderWhereInput | undefined {
  if (!searchQuery) return undefined

  return {
    OR: [
      { workOrderNumber: { contains: searchQuery, mode: "insensitive" } },
      { property: { name: { contains: searchQuery, mode: "insensitive" } } },
      { property: { streetAddress: { contains: searchQuery, mode: "insensitive" } } },
      { property: { city: { contains: searchQuery, mode: "insensitive" } } },
      { property: { state: { contains: searchQuery, mode: "insensitive" } } },
      { property: { postalCode: { contains: searchQuery, mode: "insensitive" } } },
      { warehouse: { name: { contains: searchQuery, mode: "insensitive" } } },
      { unitType: { contains: searchQuery, mode: "insensitive" } },
      { customAddress: { contains: searchQuery, mode: "insensitive" } },
      { instructions: { contains: searchQuery, mode: "insensitive" } },
      { notes: { contains: searchQuery, mode: "insensitive" } },
    ],
  }
}

function buildWorkOrderOrderBy(tableState: ServerTableQueryState): Prisma.FlooringWorkOrderOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = tableState.isAscendingSort ? "asc" : "desc"
  const orderBy: Prisma.FlooringWorkOrderOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.FlooringWorkOrderOrderByWithRelationInput> = {
    wo: { workOrderNumber: direction },
    status: { status: direction },
    warehouse: { warehouse: { name: direction } },
    property: { property: { name: direction } },
    address: { customAddress: direction },
    customAddress: { customAddress: direction },
    date: { scheduledFor: direction },
    unit: { unitNumber: direction },
    unitType: { unitType: direction },
    vacancy: { vacancy: direction },
    instructions: { instructions: direction },
    notes: { notes: direction },
  }

  if (tableState.isGroupingEnabled) {
    for (const groupKey of tableState.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { workOrderNumber: direction })

  return orderBy
}

export async function listWorkOrders(
  pagination: { skip: number; take: number } | undefined,
  tableState: ServerTableQueryState,
) {
  const workOrders = await prisma.flooringWorkOrder.findMany({
    include: {
      property: {
        select: {
          id: true,
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
      warehouse: {
        select: { id: true, name: true },
      },
      _count: {
        select: { items: true, serviceItems: true },
      },
      items: {
        where: { changeOrderStatus: "SHORTAGE" },
        select: { id: true },
        take: 1,
      },
    },
    where: buildWorkOrderWhere(tableState.searchQuery),
    orderBy: buildWorkOrderOrderBy(tableState),
    ...(pagination ?? {}),
  })

  return workOrders.map((workOrder) =>
    normalizeWorkOrder({
      ...workOrder,
      hasShortage: workOrder.items.length > 0,
    }),
  )
}

export async function getWorkOrderByIdWithClient(db: WorkOrderDbClient, id: string) {
  const workOrder = await db.flooringWorkOrder.findUniqueOrThrow({
    where: { id },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
      warehouse: { select: { id: true, name: true } },
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              name: true,
              style: true,
              color: true,
              category: {
                select: {
                  sendUnit: { select: { name: true } },
                },
              },
            },
          },
          linkedInventory: {
            select: {
              itemNumber: true,
              dyeLot: true,
              location: {
                select: {
                  locationCode: true,
                  warehouse: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      serviceItems: {
        orderBy: { createdAt: "desc" },
        include: {
          unit: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      salesReps: {
        orderBy: [{ createdAt: "desc" }, { contact: { name: "asc" } }],
        include: {
          contact: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  return {
    ...(() => {
      const normalizedItems = workOrder.items.map(normalizeWorkOrderItem)
      const normalizedServiceItems = workOrder.serviceItems.map(normalizeWorkOrderServiceItem)
      const normalizedSalesReps = workOrder.salesReps.map(normalizeWorkOrderSalesRep)

      return {
        ...normalizeWorkOrder({
          ...workOrder,
          hasShortage: workOrder.items.some((item) => item.changeOrderStatus === "SHORTAGE"),
        }),
        items: normalizedItems,
        serviceItems: normalizedServiceItems,
        salesReps: normalizedSalesReps,
        summary: normalizeWorkOrderSummary({
          items: normalizedItems,
          serviceItems: normalizedServiceItems,
        }),
        expenseSummary: normalizeWorkOrderExpenseTotals({
          items: normalizedItems,
          serviceItems: normalizedServiceItems,
          salesReps: normalizedSalesReps,
        }),
      }
    })(),
  }
}

export async function getWorkOrderById(id: string) {
  return getWorkOrderByIdWithClient(prisma, id)
}

export async function listWorkOrderItems(workOrderId: string) {
  const items = await prisma.flooringWorkOrderItem.findMany({
    where: { workOrderId },
    include: {
      product: {
        select: {
          name: true,
          style: true,
          color: true,
          category: { select: { sendUnit: { select: { name: true } } } },
        },
      },
      linkedInventory: {
        select: {
          itemNumber: true,
          dyeLot: true,
          location: {
            select: {
              locationCode: true,
              warehouse: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return items.map(normalizeWorkOrderItem)
}

export async function listWorkOrderServiceItems(workOrderId: string) {
  const items = await prisma.flooringWorkOrderServiceItem.findMany({
    where: { workOrderId },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return items.map(normalizeWorkOrderServiceItem)
}

export async function listWorkOrderSalesReps(workOrderId: string) {
  const items = await prisma.flooringWorkOrderSalesRep.findMany({
    where: { workOrderId },
    include: {
      contact: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { contact: { name: "asc" } }],
  })

  return items.map(normalizeWorkOrderSalesRep)
}

async function loadWorkOrdersPageData(page: number, tableState: ServerTableQueryState) {
  const where = buildWorkOrderWhere(tableState.searchQuery)
  const totalItems = await prisma.flooringWorkOrder.count({ where })
  const pagination = createServerPagination({ page, totalItems })

  const [workOrders, properties, warehouses, templates] = await Promise.all([
    listWorkOrders({ skip: pagination.skip, take: pagination.take }, tableState),
    prisma.property.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        streetAddress: true,
        city: true,
        state: true,
        postalCode: true,
      },
    }),
    prisma.flooringWarehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.flooringTemplate.findMany({
      orderBy: [{ property: { name: "asc" } }, { templateTag: "asc" }],
      select: {
        id: true,
        propertyId: true,
        templateTag: true,
        property: { select: { name: true } },
      },
    }),
  ])

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
    initialWorkOrders: workOrders.map((workOrder) => ({
      ...workOrder,
      itemsCount: workOrder.itemsCount ?? 0,
    })),
    propertyOptions: properties.map((property) => ({
      id: property.id,
      name: property.name,
      address: [property.streetAddress, property.city, property.state, property.postalCode].filter(Boolean).join(", "),
    })),
    warehouseOptions: warehouses,
    templateOptions: templates.map((template) => ({
      id: template.id,
      propertyId: template.propertyId,
      label: `${template.property.name} / ${template.templateTag}`,
    })),
  }
}

export async function getWorkOrdersPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() => loadWorkOrdersPageData(page, tableState))
}

export async function getWorkOrderDetailPageOptions() {
  return withPrismaConnectivityHandling(() => loadSharedRecordDetailOptions())
}

export async function getWorkOrderDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  workOrder: Awaited<ReturnType<typeof getWorkOrderById>>
  propertyOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["propertyOptions"]
  warehouseOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["warehouseOptions"]
  productOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["productOptions"]
  serviceOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["serviceOptions"]
  unitOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["unitOptions"]
  salesRepOptions: Awaited<ReturnType<typeof listSalesRepContactOptions>>
}>> {
  try {
    const [workOrder, options, salesRepOptions] = await Promise.all([
      getWorkOrderById(id),
      loadSharedRecordDetailOptions(),
      listSalesRepContactOptions(),
    ])

    return {
      ok: true,
      data: {
        workOrder,
        ...options,
        salesRepOptions,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "WORK_ORDER_DETAIL",
        title: "Work Order Unavailable",
        message: "The app could not load this work order.",
        detail: "Try refreshing the page. If this keeps happening, check the database connection and record availability.",
      }),
    }
  }
}
