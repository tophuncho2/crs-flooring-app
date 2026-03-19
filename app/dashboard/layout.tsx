import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import HeaderControls from "./header-controls"
import { prisma } from "@/server/db/prisma"
import { hasSystemAccess } from "@/server/auth/access-control"
import { requireSessionUser } from "@/server/auth/session"
import { getUserToolContext } from "@/server/platform/tool-subscriptions"
import { FLOORING_NAV_SLUGS } from "./flooring-navigation"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSessionUser()
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, role: true, isVerified: true, hiddenFlooringNavSlugs: true, flooringNavOrderSlugs: true },
  })

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
  const initialVisibleFlooringSlugs = FLOORING_NAV_SLUGS.filter((slug) => !user.hiddenFlooringNavSlugs.includes(slug))
  const initialOrderedFlooringSlugs = user.flooringNavOrderSlugs.length > 0 ? user.flooringNavOrderSlugs : FLOORING_NAV_SLUGS

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-x-0 top-3 z-50 px-3 sm:top-6 sm:px-6">
        <HeaderControls
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
