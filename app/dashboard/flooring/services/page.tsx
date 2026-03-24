import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireServicesAccess } from "@/features/flooring/shared/access/lookup-domains"
import ServicesClient from "@/features/flooring/services/components/list/services-client"
import { getServicesPageData } from "@/features/flooring/services/data/queries"
import { getUserTablePreference } from "@/server/account/table-preferences"

export default async function ServicesPage() {
  const user = await requireServicesAccess()
  const [result, initialTablePreferences] = await Promise.all([
    getServicesPageData(),
    getUserTablePreference(user.id, "services-main"),
  ])

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

  return (
    <ServicesClient
      initialServices={result.data.services}
      unitOptions={result.data.unitOptions}
      initialTablePreferences={initialTablePreferences}
    />
  )
}
