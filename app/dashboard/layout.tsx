import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import DashboardErrorState from "./dashboard-error-state"
import HeaderControlsShell from "./header-controls-shell"
import { prisma } from "@/server/db/prisma"
import { getPrismaConnectivityIssue } from "@/server/db/prisma-errors"
import { hasSystemAccess } from "@/server/auth/access-control"
import { requireSessionUser } from "@/server/auth/session"
import { getUserToolContext } from "@/server/platform/tool-subscriptions"
import { FLOORING_NAV_SLUGS } from "./flooring-navigation"

const ALWAYS_VISIBLE_FLOORING_SLUGS = new Set(["flooring-services"])

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSessionUser()
  let user
  try {
    user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, role: true, isVerified: true, hiddenFlooringNavSlugs: true, flooringNavOrderSlugs: true },
    })
  } catch (error) {
    const connectivityIssue = getPrismaConnectivityIssue(error)
    if (connectivityIssue) {
      return (
        <DashboardErrorState
          title={connectivityIssue.title}
          message={connectivityIssue.message}
          detail={connectivityIssue.detail}
          errorCode={connectivityIssue.code}
        />
      )
    }

    throw error
  }

  if (!user) {
    redirect("/login")
  }

  if (!hasSystemAccess(user.role)) {
    redirect("/login")
  }

  const toolContext = await getUserToolContext({
    userId: user.id,
    role: user.role,
  })
  const initialVisibleFlooringSlugs = FLOORING_NAV_SLUGS.filter(
    (slug) => ALWAYS_VISIBLE_FLOORING_SLUGS.has(slug) || !user.hiddenFlooringNavSlugs.includes(slug),
  )
  const initialOrderedFlooringSlugs = user.flooringNavOrderSlugs.length > 0 ? user.flooringNavOrderSlugs : FLOORING_NAV_SLUGS

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-x-0 top-3 z-50 px-3 sm:top-6 sm:px-6">
        <HeaderControlsShell
          email={user.email}
          role={user.role}
          canUseTools={toolContext.canUseTools}
          tools={toolContext.tools}
          initialVisibleFlooringSlugs={initialVisibleFlooringSlugs}
          initialOrderedFlooringSlugs={initialOrderedFlooringSlugs}
        />
      </div>

      {children}
    </div>
  )
}
