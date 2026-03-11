import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { canBypassVerification } from "@/lib/access-control"
import { prisma } from "@/lib/prisma"
import { getUserToolContext, type ToolSlug } from "@/lib/tool-subscriptions"

type ModuleCard = {
  slug: string
  name: string
  path: string
  isUnlocked: boolean
}

type FloorModuleCard = {
  slug: string
  name: string
  path: string
  requiredTool?: ToolSlug
}

const CORE_MODULE_ORDER: ToolSlug[] = ["products", "warehouse"]

function canOpenModule(hasGlobalAccess: boolean, item: { isUnlocked: boolean }) {
  return hasGlobalAccess || item.isUnlocked
}

function canOpenFloorModule(hasGlobalAccess: boolean, unlockedToolSet: Set<ToolSlug>, requiredTool?: ToolSlug) {
  return hasGlobalAccess || (requiredTool ? unlockedToolSet.has(requiredTool) : false)
}

function ModuleCardAction({ href, enabled }: { href: string; enabled: boolean }) {
  if (enabled) {
    return (
      <Link
        href={href}
        className="inline-flex w-fit rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
      >
        Open module
      </Link>
    )
  }

  return (
    <button type="button" disabled className="rounded-lg bg-blue-500/45 px-3 py-2 text-sm font-semibold text-black">
      Locked
    </button>
  )
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
  const hasAnyAccess = context.canUseTools
  const unlockedToolSet = new Set(context.tools.filter((tool) => tool.isUnlocked).map((tool) => tool.slug))

  const availableModules: ModuleCard[] = context.tools.map((tool) => ({
    slug: tool.slug,
    name: tool.name,
    path: tool.path,
    isUnlocked: tool.isUnlocked,
  }))

  const coreModules: ModuleCard[] = CORE_MODULE_ORDER.map((slug) => availableModules.find((module) => module.slug === slug)).filter(
    (module): module is ModuleCard => Boolean(module),
  )

  const movedModules: ModuleCard[] = []

  const flooringModules: FloorModuleCard[] = [
    {
      slug: "calendar",
      name: "Calendar",
      path: "/dashboard/flooring/calendar",
      requiredTool: "warehouse",
    },
    {
      slug: "work-orders",
      name: "Work Orders",
      path: "/dashboard/flooring/work-orders",
      requiredTool: "warehouse",
    },
    {
      slug: "properties",
      name: "Properties",
      path: "/dashboard/flooring/properties",
      requiredTool: "warehouse",
    },
    {
      slug: "management-companies",
      name: "Management Companies",
      path: "/dashboard/flooring/management-companies",
      requiredTool: "warehouse",
    },
    {
      slug: "templates",
      name: "Templates",
      path: "/dashboard/flooring/templates",
      requiredTool: "warehouse",
    },
    {
      slug: "manufacturers",
      name: "Manufacturers",
      path: "/dashboard/flooring/manufacturers",
      requiredTool: "products",
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-12 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-sm text-[var(--foreground)]/70">Choose a module to continue.</p>
        </div>

        <section className="mt-2 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coreModules.map((module) => {
            const accessible = canOpenModule(hasAnyAccess, module)
            return (
              <article
                key={module.slug}
                className={`flex min-h-[120px] flex-col rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 ${
                  accessible ? "" : "opacity-75"
                }`}
              >
                <h2 className="text-xl font-semibold text-blue-500">{module.name}</h2>
                <div className="mt-4">
                  <ModuleCardAction href={module.path} enabled={accessible} />
                </div>
              </article>
            )
          })}
        </section>

        <div className="mt-8 border-t border-[var(--panel-border)]" />

        <section className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {movedModules.map((module) => {
            const accessible = canOpenModule(hasAnyAccess, module)
            return (
              <article
                key={module.slug}
                className={`flex min-h-[120px] flex-col rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 ${
                  accessible ? "" : "opacity-75"
                }`}
              >
                <h2 className="text-xl font-semibold text-blue-500">{module.name}</h2>
                <div className="mt-4">
                  <ModuleCardAction href={module.path} enabled={accessible} />
                </div>
              </article>
            )
          })}

          {flooringModules.map((module) => {
            const accessible = canOpenFloorModule(hasAnyAccess, unlockedToolSet, module.requiredTool)
            return (
              <article
                key={module.slug}
                className={`flex min-h-[120px] flex-col rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 ${
                  accessible ? "" : "opacity-75"
                }`}
              >
                <h2 className="text-xl font-semibold text-blue-500">{module.name}</h2>
                <div className="mt-4">
                  <ModuleCardAction href={module.path} enabled={accessible} />
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </div>
  )
}
