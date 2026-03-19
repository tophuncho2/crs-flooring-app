import { redirect } from "next/navigation"
import { prisma } from "@/server/db/prisma"
import { requireSessionUser } from "@/server/auth/session"
import { canAccessBuilderPanel } from "@/server/auth/access-control"
import { normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import UnitOfMeasuresClient from "@/features/flooring/unit-of-measures/components/unit-of-measures-client"

export default async function UnitOfMeasuresPage() {
  const user = await requireSessionUser()

  if (!canAccessBuilderPanel(user.email, user.role)) {
    redirect("/dashboard/flooring/work-orders")
  }

  const unitOfMeasures = await prisma.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return <UnitOfMeasuresClient initialUnitOfMeasures={unitOfMeasures.map(normalizeUnitOfMeasureOption)} />
}
