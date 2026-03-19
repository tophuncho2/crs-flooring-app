import { prisma } from "@/server/db/prisma"

export async function listManufacturers() {
  return prisma.flooringManufacturer.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ companyName: "asc" }, { agentName: "asc" }],
  })
}
