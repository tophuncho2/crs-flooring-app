import { prisma } from "@/server/db/prisma"
import { requireToolAccess } from "@/server/auth/session"
import { canEditUnitOfMeasures } from "@/server/auth/access-control"
import { normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import UnitOfMeasuresClient from "@/features/flooring/unit-of-measures/components/unit-of-measures-client"

export default async function UnitOfMeasuresPage() {
  const user = await requireToolAccess("products")

  const unitOfMeasures = await prisma.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <UnitOfMeasuresClient
      canManage={canEditUnitOfMeasures(user.role)}
      initialUnitOfMeasures={unitOfMeasures.map(normalizeUnitOfMeasureOption)}
    />
  )
}
