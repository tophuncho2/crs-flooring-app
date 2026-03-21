import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import ServicesClient from "@/features/flooring/services/components/services-client"
import { listServices } from "@/features/flooring/services/queries"
import { getUnitOfMeasuresPageData } from "@/features/flooring/unit-of-measures/queries"

export default async function ServicesPage() {
  await requireToolAccess("warehouse")

  const [services, unitsResult] = await Promise.all([
    listServices(),
    getUnitOfMeasuresPageData(),
  ])

  if (!unitsResult.ok) {
    return (
      <DashboardErrorState
        title={unitsResult.error.title}
        message={unitsResult.error.message}
        detail={unitsResult.error.detail}
        errorCode={unitsResult.error.code}
      />
    )
  }

  return <ServicesClient initialServices={services} unitOptions={unitsResult.data.map((unit) => ({ id: unit.id, name: unit.name }))} />
}
