import DashboardErrorState from "@/features/app-shell/components/dashboard-error-state"
import { requireServicesAccess } from "@/features/flooring/shared/access/lookup-domains"
import ServicesClient from "@/features/flooring/services/components/list/services-client"
import { getServicesPageData } from "@/features/flooring/services/data/queries"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"
import { parseServerTableQueryState } from "@/server/pagination"

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireServicesAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "services-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["unit"],
    allowedGroupKeys: ["unit"],
  })
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

  return (
    <ServicesClient
      initialServices={result.data.services}
      unitOptions={result.data.unitOptions}
      initialTablePreferences={initialTablePreferences}
      tableState={tableState}
    />
  )
}
