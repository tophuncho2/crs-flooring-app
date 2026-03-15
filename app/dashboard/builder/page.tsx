import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { normalizeUnitOfMeasureOption } from "@/lib/flooring-unit-measures"
import { prisma } from "@/lib/prisma"
import { canAccessBuilderPanel, canBypassVerification } from "@/lib/access-control"
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

  if (!canAccessBuilderPanel(user.email, user.role)) {
    redirect("/dashboard")
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    redirect("/login?restricted=1")
  }

  const unitOfMeasures = await prisma.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return <BuilderUsersPanel initialUnitOfMeasures={unitOfMeasures.map(normalizeUnitOfMeasureOption)} />
}
