import type { ReactNode } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../api/auth/[...nextauth]/route"
import ToolsMenu from "./tools-menu"
import UserMenu from "./user-menu"
import { prisma } from "@/lib/prisma"
import { canBypassVerification } from "@/lib/access-control"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const user = session.user.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { email: true, role: true, isVerified: true },
      })
    : null

  if (!user) {
    redirect("/login")
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    redirect("/login?restricted=1")
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed right-3 top-3 z-50 flex items-center gap-2 sm:right-6 sm:top-6 sm:gap-4">
        {(user.role === "BUILDER" || user.role === "ADMIN") && (
          <ToolsMenu role={user.role} />
        )}
        <UserMenu email={user.email} role={user.role} />
      </div>

      {children}
    </div>
  )
}
