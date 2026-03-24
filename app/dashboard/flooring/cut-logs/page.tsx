import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"
import { parseServerTableQueryState } from "@/server/pagination"
import CutLogsClient from "@/features/flooring/cut-logs/components/cut-logs-client"
import { getCutLogsPageData } from "@/features/flooring/cut-logs/data/queries"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME } from "@/features/flooring/shared/ui/display/dashboard-card-title"

export default async function FlooringCutLogsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "cut-logs-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : false,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : [],
    allowedGroupKeys: ["product", "location", "itemNumber"],
  })
  const result = await getCutLogsPageData()

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
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <CutLogsClient
        initialLogs={result.data.initialLogs}
        initialTablePreferences={initialTablePreferences}
        tableState={tableState}
      />
    </div>
  )
}
