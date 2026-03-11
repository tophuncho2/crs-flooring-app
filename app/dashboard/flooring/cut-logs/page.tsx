import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import CutLogsClient from "./cut-logs-client"

function buildProductName(product: {
  name: string
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return product.name || [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

export default async function FlooringCutLogsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) redirect("/login")
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "warehouse" }))) redirect("/dashboard")

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
              manufacturerName: true,
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
      productName: buildProductName(log.inventory.product),
      itemNumber: log.inventory.itemNumber,
      locationLabel: `${log.inventory.location.warehouse.name} / ${log.inventory.location.locationCode}`,
      before: Number(log.before).toFixed(2),
      cut: Number(log.cut).toFixed(2),
      after: Number(log.after).toFixed(2),
      notes: log.notes || "",
    }
  })

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <CutLogsClient initialLogs={logs} />
    </div>
  )
}
