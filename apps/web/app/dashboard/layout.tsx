import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import HeaderControls from "@/modules/app-shell/components/header-controls"
import { HubPanelProvider } from "@/modules/app-shell/components/hub-panel-provider"
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
    <HubPanelProvider>
      <div className="relative min-h-screen">
        <div className="fixed inset-x-0 top-3 z-50 px-3 sm:top-6 sm:px-6">
          <HeaderControls email={user.email} role={user.role} />
        </div>

        {children}
      </div>
    </HubPanelProvider>
  )
}
