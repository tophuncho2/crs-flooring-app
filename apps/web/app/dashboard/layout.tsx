import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import HeaderControls from "@/modules/app-shell/components/header-controls"
import NavRail from "@/modules/app-shell/components/nav-rail"
import {
  NAV_RAIL_CONTENT_OFFSET_CLASS,
  NAV_RAIL_HEADER_OFFSET_CLASS,
} from "@/modules/app-shell/navigation/definitions"
import { getPrismaConnectivityIssue } from "@builders/db"
import { requireSessionUser } from "@/server/auth/session"
import { getDashboardLayoutUser } from "@/server/account/dashboard-layout"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSessionUser()
  let user
  try {
    user = await getDashboardLayoutUser(sessionUser.id)
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

  return (
    <div className="relative min-h-screen">
      <NavRail email={user.email} role={user.role} />

      <div className={`fixed right-0 top-3 z-50 px-3 sm:top-6 sm:px-6 ${NAV_RAIL_HEADER_OFFSET_CLASS}`}>
        <HeaderControls />
      </div>

      <div className={NAV_RAIL_CONTENT_OFFSET_CLASS}>{children}</div>
    </div>
  )
}
