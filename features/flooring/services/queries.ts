import { prisma } from "@/server/db/prisma"
import { normalizeServiceOption } from "./services"

export async function listServiceOptions() {
  const services = await prisma.flooringService.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      baseCost: true,
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
