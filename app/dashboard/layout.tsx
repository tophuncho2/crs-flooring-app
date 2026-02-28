import type { ReactNode } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../api/auth/[...nextauth]/route"
import ToolsMenu from "./tools-menu"
import UserMenu from "./user-menu"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed right-3 top-3 z-50 flex items-center gap-2 sm:right-6 sm:top-6 sm:gap-4">
        {(session.user.role === "BUILDER" || session.user.role === "ADMIN") && (
          <ToolsMenu role={session.user.role} />
        )}
        <UserMenu email={session.user.email ?? ""} role={session.user.role} />
      </div>

      {children}
    </div>
  )
}
