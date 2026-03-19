import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getWorkOrdersPageData } from "@/features/flooring/work-orders/queries"
import WorkOrdersClient from "@/features/flooring/work-orders/components/work-orders-client"

export default async function WorkOrdersPage() {
  await requireToolAccess("warehouse")
  const result = await getWorkOrdersPageData()

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

  const pageData = result.data

  return (
    <WorkOrdersClient
      initialWorkOrders={pageData.initialWorkOrders}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      productOptions={pageData.productOptions}
      templateOptions={pageData.templateOptions}
      serviceOptions={pageData.serviceOptions}
      unitOptions={pageData.unitOptions}
    />
  )
}
