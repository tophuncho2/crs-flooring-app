import { prisma } from "@/server/db/prisma"
import { requireToolAccess } from "@/server/auth/session"
import CutLogsClient from "@/features/flooring/cut-logs/components/cut-logs-client"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME } from "@/features/flooring/shared/dashboard-card-title"
import { buildFlooringProductDisplayName } from "@/features/flooring/shared/domain/product-display-name"

export default async function FlooringCutLogsPage() {
  await requireToolAccess("warehouse")

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

  const logs = rawLogs.map((log) => {
    return {
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
    }
  })

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <CutLogsClient initialLogs={logs} />
    </div>
  )
}
