import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth/auth-options"
import { prisma } from "@/server/db/prisma"
import { isToolUnlocked } from "@/server/platform/tool-subscriptions"

type RouteContext = {
  params: Promise<{ slug: string }>
}

const FLOORING_MODULE_LABELS: Record<string, string> = {
  warehouse: "Warehouse",
  calendar: "Calendar",
  "cut-logs": "Cut Logs",
  inventory: "Inventory",
  imports: "Imports",
  "work-orders": "Work Orders",
  properties: "Properties",
  "management-companies": "Management Companies",
  templates: "Templates",
  manufacturers: "Manufacturers",
}

export default async function FlooringPlaceholderPage({ params }: RouteContext) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) {
    redirect("/login")
  }

  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "warehouse" }))) {
    redirect("/dashboard")
  }

  const resolvedParams = await params
  const title = FLOORING_MODULE_LABELS[resolvedParams.slug] ?? "Flooring Module"

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-12 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-6">
          <h1 className="text-3xl font-bold text-blue-500">{title}</h1>
          <p className="mt-2 text-sm text-[var(--foreground)]/75">This flooring module is not fully built yet.</p>
          <p className="mt-4 text-sm text-[var(--foreground)]/75">
            You can continue this work on the page later and wire it to the new flooring schema tables.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
