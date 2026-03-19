import { prisma } from "@/server/db/prisma"
import { requireToolAccess } from "@/server/auth/session"
import ServicesClient from "@/features/flooring/services/components/services-client"
import { listServices } from "@/features/flooring/services/queries"

export default async function ServicesPage() {
  await requireToolAccess("warehouse")

  const [services, units] = await Promise.all([
    listServices(),
    prisma.flooringUnitOfMeasure.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  return <ServicesClient initialServices={services} unitOptions={units} />
}
