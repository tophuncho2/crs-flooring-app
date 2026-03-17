import { prisma } from "@/server/db/prisma"

export async function listImportLocationOptions() {
  const rows = await prisma.flooringLocation.findMany({
    select: {
      id: true,
      warehouseId: true,
      locationCode: true,
      section: { select: { name: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: [{ warehouse: { name: "asc" } }, { locationCode: "asc" }],
  })

  return rows.map((row) => ({
    id: row.id,
    warehouseId: row.warehouseId,
    locationCode: row.locationCode,
    sectionName: row.section?.name ?? null,
    warehouseName: row.warehouse.name,
  }))
}
