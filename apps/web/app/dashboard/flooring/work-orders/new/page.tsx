import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireWorkOrdersAccess } from "@/features/flooring/shared/access/templates-work-orders"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { getWorkOrderDetailPageOptions } from "@/features/flooring/work-orders/queries"
import { WorkOrderCreateClient } from "@/features/flooring/work-orders/record/create/work-order-create-client"

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
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/work-orders")}
      propertyOptions={result.data.propertyOptions}
      warehouseOptions={result.data.warehouseOptions}
    />
  )
}
