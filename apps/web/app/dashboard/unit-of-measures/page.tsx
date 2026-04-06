import { canEditUnitOfMeasures } from "@/server/auth/access-control"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireUnitOfMeasuresAccess } from "@/modules/shared/access/lookup-domains"
import UnitOfMeasuresClient from "@/modules/unit-of-measures/components/list/unit-of-measures-client"
import { getUnitOfMeasuresPageData } from "@/modules/unit-of-measures/data/queries"
import { getResolvedUserTablePreference } from "@builders/application"
import { parseServerTableQueryState } from "@/server/pagination"

export default async function UnitOfMeasuresPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireUnitOfMeasuresAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "unit-of-measures-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["name"],
    allowedGroupKeys: ["name"],
  })
  const pageData = await getUnitOfMeasuresPageData()

  if (!pageData.ok) {
    return (
      <DashboardErrorState
        title={pageData.error.title}
        message={pageData.error.message}
        detail={pageData.error.detail}
        errorCode={pageData.error.code}
      />
    )
  }

  return (
    <UnitOfMeasuresClient
      canManage={canEditUnitOfMeasures(user.role)}
      initialUnitOfMeasures={pageData.data}
      initialTablePreferences={initialTablePreferences}
      tableState={tableState}
    />
  )
}
