import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { buildWorkOrderPickingTicketHtml } from "@builders/domain"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { WorkOrderPrintView } from "@/modules/work-orders/components/record/print/work-order-print-view"
import { getWorkOrderForFileGenerationPageData } from "@/modules/work-orders/data/queries"

export const metadata: Metadata = {
  title: { absolute: "CRS Floor Covering" },
}

export default async function WorkOrderPickingTicketPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const result = await getWorkOrderForFileGenerationPageData(id)

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

  return <WorkOrderPrintView html={buildWorkOrderPickingTicketHtml(result.data.workOrder)} />
}
