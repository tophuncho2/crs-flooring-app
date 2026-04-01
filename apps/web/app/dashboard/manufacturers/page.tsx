import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireManufacturersAccess } from "@/modules/shared/access/lookup-domains"
import ManufacturersClient from "@/modules/manufacturers/components/list/manufacturers-client"
import { getManufacturersPageData } from "@/modules/manufacturers/data/queries"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"
import { parseServerTableQueryState } from "@/server/pagination"

export default async function ManufacturersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireManufacturersAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "manufacturers-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["companyName"],
    allowedGroupKeys: ["companyName"],
  })
  const result = await getManufacturersPageData()

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
      tableState={tableState}
    />
  )
}
