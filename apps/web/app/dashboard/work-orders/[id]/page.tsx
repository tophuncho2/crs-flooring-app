import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getWorkOrderDetailPageData } from "@/modules/work-orders/data/queries"
import { WorkOrderDetailClient } from "@/modules/work-orders/components/record/work-order-detail-client"

export default async function WorkOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

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
      initialWorkOrder={result.data.workOrder}
      initialMaterialItems={result.data.materialItems}
      initialAdjustmentsForWorkOrder={result.data.adjustmentsForWorkOrder}
      initialPlannedPayments={result.data.plannedPayments}
      initialPayments={result.data.payments}
      printCounts={result.data.printCounts}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/work-orders")}
    />
  )
}
