import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { WorkOrderCreateClient } from "@/modules/work-orders/components/record/work-order-create-client"
import { getWorkOrderCreatePageData } from "@/modules/work-orders/data/queries"

export default async function WorkOrderCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const options = await getWorkOrderCreatePageData()
    return (
      <WorkOrderCreateClient
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/work-orders")}
        options={options}
      />
    )
  } catch (error) {
    return (
      <DashboardErrorState
        title="Work Order Form Unavailable"
        message="The app could not load form options for new work orders."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="WORK_ORDER_CREATE_LOAD_FAILED"
      />
    )
  }
}
