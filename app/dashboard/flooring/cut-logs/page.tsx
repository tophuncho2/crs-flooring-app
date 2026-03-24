import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import CutLogsClient from "@/features/flooring/cut-logs/components/cut-logs-client"
import { getCutLogsPageData } from "@/features/flooring/cut-logs/data/queries"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME } from "@/features/flooring/shared/ui/display/dashboard-card-title"

export default async function FlooringCutLogsPage() {
  await requireToolAccess("warehouse")
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
      <CutLogsClient initialLogs={result.data.initialLogs} />
    </div>
  )
}
