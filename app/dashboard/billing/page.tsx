import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canBypassVerification } from "@/lib/access-control"
import { getUserToolContext } from "@/lib/tool-subscriptions"
import BillingClient from "./billing-client"

export default async function BillingPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true, isVerified: true },
  })

  if (!user) {
    redirect("/login")
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    redirect("/login?restricted=1")
  }

  const context = await getUserToolContext({ userId: user.id, role: user.role })

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <BillingClient initialContext={context} />
      </div>
    </div>
  )
}
