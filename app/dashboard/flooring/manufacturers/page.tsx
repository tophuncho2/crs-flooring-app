import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireManufacturersAccess } from "@/features/flooring/shared/access/lookup-domains"
import ManufacturersClient from "@/features/flooring/manufacturers/components/list/manufacturers-client"
import { getManufacturersPageData } from "@/features/flooring/manufacturers/data/queries"
import { getUserTablePreference } from "@/server/account/table-preferences"

export default async function ManufacturersPage() {
  const user = await requireManufacturersAccess()
  const [result, initialTablePreferences] = await Promise.all([
    getManufacturersPageData(),
    getUserTablePreference(user.id, "manufacturers-main"),
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
    <ManufacturersClient
      initialManufacturers={result.data}
      initialTablePreferences={initialTablePreferences}
    />
  )
}
