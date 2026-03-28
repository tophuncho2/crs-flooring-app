import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { notFound } from "next/navigation"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { requireWorkOrdersAccess } from "@/features/flooring/shared/access/templates-work-orders"
import { getWorkOrderDetailPageData } from "@/features/flooring/work-orders/queries"
import WorkOrderDetailClient from "@/features/flooring/work-orders/detail/work-order-detail-client"

export default async function WorkOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireWorkOrdersAccess()

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getWorkOrderDetailPageData(id)

  if (!result.ok) {
    if ("notFound" in result && result.notFound) {
      notFound()
    }

    if (!("error" in result)) {
      notFound()
    }

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
    <WorkOrderDetailClient
      currentUserId={user.id}
      workOrder={result.data.workOrder}
      productOptions={result.data.productOptions}
      propertyOptions={result.data.propertyOptions}
      warehouseOptions={result.data.warehouseOptions}
      serviceOptions={result.data.serviceOptions}
      salesRepOptions={result.data.salesRepOptions}
      unitOptions={result.data.unitOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/work-orders")}
    />
  )
}
