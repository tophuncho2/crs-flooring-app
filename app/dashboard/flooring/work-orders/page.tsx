import { requireToolAccess } from "@/server/auth/session"
import { getWorkOrdersPageData } from "@/features/flooring/work-orders/queries"
import WorkOrdersClient from "@/features/flooring/work-orders/components/work-orders-client"

export default async function WorkOrdersPage() {
  await requireToolAccess("warehouse")
  const pageData = await getWorkOrdersPageData()

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
