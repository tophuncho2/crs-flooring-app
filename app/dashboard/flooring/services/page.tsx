import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireServicesAccess } from "@/features/flooring/shared/access/lookup-domains"
import ServicesClient from "@/features/flooring/services/components/list/services-client"
import { getServicesPageData } from "@/features/flooring/services/data/queries"

export default async function ServicesPage() {
  await requireServicesAccess()
  const result = await getServicesPageData()

  if (!result.ok) {
    return (
      <DashboardErrorState
        title={result.error.title}
        message={result.error.message}
        detail={result.error.detail}
        errorCode={result.error.code}
      />
    )
  }

  return <ServicesClient initialServices={result.data.services} unitOptions={result.data.unitOptions} />
}
