import { prisma, withPrismaConnectivityHandling } from "@builders/db"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"
import { buildFlooringProductDisplayName } from "@builders/domain"

export type CutLogPageRow = {
  id: string
  inventoryId: string
  createdAt: string
  productName: string
  itemNumber: string
  locationLabel: string
  before: string
  cut: string
  after: string
  notes: string
}

async function loadCutLogRows() {
  const rawLogs = await prisma.flooringCutLog.findMany({
    include: {
      inventory: {
        select: {
          id: true,
          itemNumber: true,
          location: {
            select: {
              locationCode: true,
              warehouse: { select: { name: true } },
            },
          },
          product: {
            select: {
              name: true,
              style: true,
              color: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 250,
  })

  return rawLogs.map(
    (log): CutLogPageRow => ({
      id: log.id,
      inventoryId: log.inventory.id,
      createdAt: log.createdAt.toISOString(),
      productName: buildFlooringProductDisplayName(log.inventory.product),
      itemNumber: log.inventory.itemNumber,
      locationLabel: log.inventory.location ? `${log.inventory.location.warehouse.name} / ${log.inventory.location.locationCode}` : "No location",
      before: Number(log.before).toFixed(2),
      cut: Number(log.cut).toFixed(2),
      after: Number(log.after).toFixed(2),
      notes: log.notes || "",
    }),
  )
}

export async function getCutLogsPageData() {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming(
      {
        loader: "flooring.cutLogs.list",
      },
      async () => ({
        initialLogs: await loadCutLogRows(),
      }),
    ),
  )
}
