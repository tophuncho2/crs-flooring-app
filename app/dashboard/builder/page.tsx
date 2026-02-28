import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { canBypassVerification } from "@/lib/access-control"
import BuilderUsersPanel from "./users-panel"

export default async function BuilderPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true, email: true, isVerified: true },
  })

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "BUILDER") {
    redirect("/dashboard")
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    redirect("/login?restricted=1")
  }

  return <BuilderUsersPanel />
}
