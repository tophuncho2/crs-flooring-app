import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth/auth-options"
import { normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import { prisma } from "@/server/db/prisma"
import { canAccessBuilderPanel } from "@/server/auth/access-control"
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
    redirect("/dashboard/flooring/work-orders")
  }

  const unitOfMeasures = await prisma.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return <BuilderUsersPanel initialUnitOfMeasures={unitOfMeasures.map(normalizeUnitOfMeasureOption)} />
}
