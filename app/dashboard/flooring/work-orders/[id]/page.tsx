import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/flooring/shared/detail-routes"
import { getWorkOrderById, getWorkOrderDetailPageOptions } from "@/features/flooring/work-orders/queries"
import WorkOrderDetailClient from "@/features/flooring/work-orders/detail/work-order-detail-client"

export default async function WorkOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const [workOrder, pageData] = await Promise.all([
      getWorkOrderById(id),
      getWorkOrderDetailPageOptions(),
    ])

    if (!pageData.ok) {
      throw new Error("Failed to load work order detail options")
    }

    return (
      <WorkOrderDetailClient
        workOrder={workOrder}
        productOptions={pageData.data.productOptions}
        propertyOptions={pageData.data.propertyOptions}
        warehouseOptions={pageData.data.warehouseOptions}
        serviceOptions={pageData.data.serviceOptions}
        unitOptions={pageData.data.unitOptions}
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/work-orders")}
      />
    )
  } catch {
    notFound()
  }
}
