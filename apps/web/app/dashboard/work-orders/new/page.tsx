import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireWorkOrdersAccess } from "@/modules/shared/access/templates-work-orders"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getWorkOrderDetailPageOptions } from "@/modules/work-orders/queries"
import { WorkOrderCreateClient } from "@/modules/work-orders/record/create/work-order-create-client"

export default async function WorkOrderCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireWorkOrdersAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getWorkOrderDetailPageOptions()

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
    <WorkOrderCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/work-orders")}
      propertyOptions={result.data.propertyOptions}
      warehouseOptions={result.data.warehouseOptions}
    />
  )
}
