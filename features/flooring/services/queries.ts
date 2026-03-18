import { prisma } from "@/server/db/prisma"
import { normalizeServiceOption, normalizeServiceRow } from "./services"

export async function listServices() {
  const services = await prisma.flooringService.findMany({
    include: {
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          templateItems: true,
          workOrderItems: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return services.map(normalizeServiceRow)
}

export async function listServiceOptions() {
  const services = await prisma.flooringService.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      baseCost: true,
      notes: true,
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return services.map(normalizeServiceOption)
}
