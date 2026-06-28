import type { Metadata } from "next"
import { notFound } from "next/navigation"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import { WorkOrderPrintConfigurator } from "@/modules/work-orders/components/record/print/work-order-print-configurator"
import { getWorkOrderForFileGenerationPageData } from "@/modules/work-orders/data/queries"
import { getBrandLogoPrintUrl } from "@/server/storage/s3"

export const metadata: Metadata = {
  title: { absolute: "CRS Floor Covering" },
}

export default async function WorkOrderPickingTicketPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSessionUser()

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

  const logoUrl = await getBrandLogoPrintUrl()

  return (
    <WorkOrderPrintConfigurator
      input={result.data.workOrder}
      logoUrl={logoUrl}
      preset="pickingTicket"
    />
  )
}
