import { prisma } from "@/server/db/prisma"
import { normalizeWorkOrder, normalizeWorkOrderItem, normalizeWorkOrderServiceItem } from "./services"

export async function listWorkOrders() {
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
      analytics: {
        select: {
          totalMaterialCost: true,
          totalServiceCost: true,
          totalCost: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  })

  return workOrders.map(normalizeWorkOrder)
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
      analytics: {
        select: {
          totalMaterialCost: true,
          totalServiceCost: true,
          totalCost: true,
        },
      },
    },
  })

  return {
    ...normalizeWorkOrder(workOrder),
    items: workOrder.items.map(normalizeWorkOrderItem),
    serviceItems: workOrder.serviceItems.map(normalizeWorkOrderServiceItem),
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
