import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"

function buildProductName(product: {
  name: string
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return product.name || [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

function formatEffect(value: number) {
  if (value > 0) return `-${value.toFixed(2)}`
  if (value < 0) return `+${Math.abs(value).toFixed(2)}`
  return "0.00"
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

  const logs = await prisma.flooringCutLog.findMany({
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

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <h1 className="text-2xl font-bold text-blue-500">Cut Logs</h1>
        <p className="mt-2 text-sm text-[var(--foreground)]/70">Inventory adjustments. Positive values reduce stock and negative values add stock back.</p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-[var(--panel-hover)] text-left">
              <tr>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Item #</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Adjustment</th>
                <th className="px-3 py-2">Effect on Stock</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const quantity = Number(log.quantityTaken)
                return (
                  <tr key={log.id} className="border-t border-[var(--panel-border)]">
                    <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{buildProductName(log.inventory.product)}</td>
                    <td className="px-3 py-2">{log.inventory.itemNumber}</td>
                    <td className="px-3 py-2">{`${log.inventory.location.warehouse.name} / ${log.inventory.location.locationCode}`}</td>
                    <td className="px-3 py-2">{quantity.toFixed(2)}</td>
                    <td className="px-3 py-2">{formatEffect(quantity)}</td>
                    <td className="px-3 py-2">{log.notes || "-"}</td>
                  </tr>
                )
              })}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                    No cut logs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
