import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { listServiceOptions } from "@/features/flooring/services/queries"
import { buildProductName } from "@/features/flooring/products/services"
import { normalizeWorkOrder, normalizeWorkOrderItem, normalizeWorkOrderServiceItem, normalizeWorkOrderSummary } from "./services"

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

export async function getWorkOrderById(id: string) {
  const workOrder = await prisma.flooringWorkOrder.findUniqueOrThrow({
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
              manufacturerName: true,
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
    },
  })

  return {
    ...(() => {
      const normalizedItems = workOrder.items.map(normalizeWorkOrderItem)
      const normalizedServiceItems = workOrder.serviceItems.map(normalizeWorkOrderServiceItem)

      return {
        ...normalizeWorkOrder({
          ...workOrder,
          hasShortage: workOrder.items.some((item) => item.changeOrderStatus === "SHORTAGE"),
        }),
        items: normalizedItems,
        serviceItems: normalizedServiceItems,
        summary: normalizeWorkOrderSummary({
          items: normalizedItems,
          serviceItems: normalizedServiceItems,
        }),
      }
    })(),
  }
}

export async function listWorkOrderItems(workOrderId: string) {
  const items = await prisma.flooringWorkOrderItem.findMany({
    where: { workOrderId },
    include: {
      product: {
        select: {
          manufacturerName: true,
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

async function loadWorkOrdersPageData(page: number, tableState: ServerTableQueryState) {
  const where = buildWorkOrderWhere(tableState.searchQuery)
  const totalItems = await prisma.flooringWorkOrder.count({ where })
  const pagination = createServerPagination({ page, totalItems })

  const [workOrders, properties, warehouses, products, templates, services, units] = await Promise.all([
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
    prisma.flooringProduct.findMany({
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
        style: true,
        color: true,
        category: { select: { sendUnit: { select: { name: true } } } },
      },
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
    listServiceOptions(),
    prisma.flooringUnitOfMeasure.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
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
    productOptions: products.map((product) => ({
      id: product.id,
      label: buildProductName(product),
      sendUnit: product.category.sendUnit?.name ?? "",
    })),
    templateOptions: templates.map((template) => ({
      id: template.id,
      propertyId: template.propertyId,
      label: `${template.property.name} / ${template.templateTag}`,
    })),
    serviceOptions: services,
    unitOptions: units,
  }
}

export async function getWorkOrdersPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() => loadWorkOrdersPageData(page, tableState))
}
