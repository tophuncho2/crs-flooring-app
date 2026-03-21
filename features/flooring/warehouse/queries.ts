import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import type { LocationRow, SectionRow, WarehouseRow } from "./types"

async function loadWarehouseRows() {
  const warehouses = await prisma.flooringWarehouse.findMany({
    include: {
      _count: {
        select: {
          sections: true,
          locations: true,
          workOrders: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return warehouses.map(
    (warehouse): WarehouseRow => ({
      id: warehouse.id,
      name: warehouse.name,
      address: warehouse.address,
      phone: warehouse.phone,
      sectionsCount: warehouse._count.sections,
      locationsCount: warehouse._count.locations,
      workOrdersCount: warehouse._count.workOrders,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    }),
  )
}

export async function getWarehousePageData() {
  return withPrismaConnectivityHandling(() => loadWarehouseRows())
}

export async function getWarehouseById(id: string) {
  const warehouse = await prisma.flooringWarehouse.findUniqueOrThrow({
    where: { id },
    include: {
      _count: {
        select: {
          sections: true,
          locations: true,
          workOrders: true,
        },
      },
      sections: {
        select: {
          id: true,
          name: true,
          _count: {
            select: { locations: true },
          },
        },
        orderBy: { name: "asc" },
      },
      locations: {
        select: {
          id: true,
          locationCode: true,
          sectionId: true,
          section: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ section: { name: "asc" } }, { locationCode: "asc" }],
      },
    },
  })

  return {
    warehouse: {
      id: warehouse.id,
      name: warehouse.name,
      address: warehouse.address,
      phone: warehouse.phone,
      sectionsCount: warehouse._count.sections,
      locationsCount: warehouse._count.locations,
      workOrdersCount: warehouse._count.workOrders,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    } satisfies WarehouseRow,
    sections: warehouse.sections.map(
      (section): SectionRow => ({
        id: section.id,
        name: section.name,
        locationsCount: section._count.locations,
      }),
    ),
    locations: warehouse.locations.map(
      (location): LocationRow => ({
        id: location.id,
        locationCode: location.locationCode,
        sectionId: location.sectionId,
        sectionName: location.section?.name ?? null,
      }),
    ),
  }
}
