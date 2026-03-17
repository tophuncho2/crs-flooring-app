import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth/auth-options"
import { prisma } from "@/server/db/prisma"
import { isToolUnlocked } from "@/server/platform/tool-subscriptions"

function formatDateKey(value: Date | null) {
  if (!value) return "Unscheduled"
  return value.toISOString().slice(0, 10)
}

export default async function FlooringCalendarPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) redirect("/login")
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "warehouse" }))) redirect("/dashboard/flooring/work-orders")

  const workOrders = await prisma.flooringWorkOrder.findMany({
    include: {
      property: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
    },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
    take: 200,
  })

  const grouped = new Map<string, typeof workOrders>()
  for (const order of workOrders) {
    const key = formatDateKey(order.scheduledFor)
    grouped.set(key, [...(grouped.get(key) ?? []), order])
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <h1 className="text-2xl font-bold text-blue-500">Calendar</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/70">Work order schedule view. More calendar behavior can be layered onto this page next.</p>

        <div className="mt-6 space-y-4">
          {Array.from(grouped.entries()).map(([dateKey, entries]) => (
            <div key={dateKey} className="rounded-lg border border-[var(--panel-border)]">
              <div className="border-b border-[var(--panel-border)] bg-[var(--panel-hover)] px-4 py-3">
                <h2 className="text-base font-semibold">
                  {dateKey === "Unscheduled" ? "Unscheduled" : new Date(`${dateKey}T00:00:00`).toLocaleDateString()}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="px-3 py-2">Work Order</th>
                      <th className="px-3 py-2">Property</th>
                      <th className="px-3 py-2">Warehouse</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((order, index) => (
                      <tr key={order.id} className="border-t border-[var(--panel-border)]">
                        <td className="px-3 py-2 font-medium text-blue-500">WO-{String(index + 1).padStart(4, "0")}</td>
                        <td className="px-3 py-2">{order.property.name}</td>
                        <td className="px-3 py-2">{order.warehouse?.name ?? "-"}</td>
                        <td className="px-3 py-2">{order.status.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2">
                          {[order.unitLabel, order.unitNumber, order.unitType].filter(Boolean).join(" ") || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <Link href={`/dashboard/flooring/work-orders/${order.id}`} className="text-blue-500 hover:underline">
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {grouped.size === 0 ? (
            <div className="rounded-lg border border-[var(--panel-border)] px-4 py-8 text-center text-[var(--foreground)]/70">
              No work orders are scheduled yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
