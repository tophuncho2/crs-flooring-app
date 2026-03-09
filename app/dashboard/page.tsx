import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { canBypassVerification } from "@/lib/access-control"
import { prisma } from "@/lib/prisma"
import { getUserToolContext, toolCentsToDisplay } from "@/lib/tool-subscriptions"

type ModuleCard = {
  slug: string
  name: string
  description: string
  path: string
  isUnlocked: boolean
  defaultMonthlyPriceCents: number
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, isVerified: true, email: true },
  })

  if (!user) {
    redirect("/login")
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    redirect("/login?restricted=1")
  }

  const context = await getUserToolContext({ userId: user.id, role: user.role })
  const modules: ModuleCard[] = context.tools.map((tool) => {
    return {
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      path: tool.path,
      isUnlocked: tool.isUnlocked,
      defaultMonthlyPriceCents: tool.monthlyPriceCents,
    }
  })
  const monthlyCost = toolCentsToDisplay(context.monthlyCostCents)
  const hasAnyAccess = context.canUseTools

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-12 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-sm text-[var(--foreground)]/70">Choose a module to continue.</p>
          </div>
          <div className="text-sm text-[var(--foreground)]/80">
            <p className="font-semibold">Current monthly cost</p>
            <p>{monthlyCost}</p>
          </div>
        </div>

        <div className="mt-2 mb-6">
          <Link href="/dashboard/billing" className="text-sm font-semibold text-blue-500 hover:underline">
            Manage tool access and billing
          </Link>
        </div>

        <div className="mt-2 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const canOpen = hasAnyAccess && module.isUnlocked
            const buttonLabel = canOpen ? "Open module" : "Unlock in Billing"
            const buttonHref = canOpen ? module.path : "/dashboard/billing"
            const price = toolCentsToDisplay(module.defaultMonthlyPriceCents)

            return (
              <article
                key={module.slug}
                className={`flex flex-col rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 ${
                  canOpen ? "" : "opacity-75"
                }`}
              >
                <h2 className="text-xl font-semibold text-blue-500">{module.name}</h2>
                <p className="mt-2 flex-1 text-sm text-[var(--foreground)]/75">{module.description}</p>
                <p className="mt-3 text-sm text-[var(--foreground)]/80">Monthly add-on: {price}</p>
                <Link
                  href={buttonHref}
                  className="mt-4 inline-flex w-fit rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
                >
                  {buttonLabel}
                </Link>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
