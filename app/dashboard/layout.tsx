import type { ReactNode } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import ToolsMenu from "./tools-menu"
import FlooringToolsMenu from "./flooring-tools-menu"
import UserMenu from "./user-menu"
import { prisma } from "@/lib/prisma"
import { canBypassVerification } from "@/lib/access-control"
import { getUserToolContext } from "@/lib/tool-subscriptions"

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
        select: { id: true, email: true, role: true, isVerified: true },
      })
    : null

  if (!user) {
    redirect("/login")
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    redirect("/login?restricted=1")
  }

  const toolContext = await getUserToolContext({
    userId: user.id,
    role: user.role,
  })

  return (
    <div className="relative min-h-screen">
      {(toolContext.role === "BUILDER" || toolContext.role === "ADMIN") ? null : toolContext.trialEndsAt ? (
        <div className="fixed inset-x-0 top-0 z-40 border-b border-blue-500/35 bg-blue-500/15 px-4 py-2 text-sm text-blue-200">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <p>
              {toolContext.isTrialActive
                ? `Free trial active: ${toolContext.trialDaysRemaining} days left (ends ${new Date(toolContext.trialEndsAt).toLocaleDateString()}).`
                : `Your free trial ended. Enable tools on Billing to continue using paid modules.`}
            </p>
          </div>
        </div>
      ) : null}
      <div className="fixed right-3 top-3 z-50 flex items-center gap-2 sm:right-6 sm:top-6 sm:gap-4">
        <FlooringToolsMenu canUseTools={toolContext.canUseTools} tools={toolContext.tools} />
        <ToolsMenu canUseTools={toolContext.canUseTools} tools={toolContext.tools} />
        <UserMenu
          email={user.email}
          role={user.role}
          canUseTools={toolContext.canUseTools}
          unlockedToolSlugs={toolContext.tools.filter((tool) => tool.isUnlocked).map((tool) => tool.slug)}
        />
      </div>

      {children}
    </div>
  )
}
