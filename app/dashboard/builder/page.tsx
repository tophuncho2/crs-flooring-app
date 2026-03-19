import { redirect } from "next/navigation"
import { normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import { prisma } from "@/server/db/prisma"
import { canAccessBuilderPanel } from "@/server/auth/access-control"
import { requireSessionUser } from "@/server/auth/session"
import BuilderUsersPanel from "./users-panel"

export default async function BuilderPage() {
  const user = await requireSessionUser()

  if (!canAccessBuilderPanel(user.email, user.role)) {
    redirect("/dashboard/flooring/work-orders")
  }

  const unitOfMeasures = await prisma.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return <BuilderUsersPanel initialUnitOfMeasures={unitOfMeasures.map(normalizeUnitOfMeasureOption)} />
}
