import type { Metadata } from "next"
import { notFound } from "next/navigation"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import { InventoryPrintView } from "@/modules/inventory/components/record/print/inventory-print-view"
import { getInventoryDetailPageData } from "@/modules/inventory/data/queries"

export const metadata: Metadata = {
  title: { absolute: "CRS Floor Covering" },
}

export default async function InventoryPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSessionUser()

  const { id } = await params
  const result = await getInventoryDetailPageData(id)

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

  return <InventoryPrintView record={result.data.inventory} />
}
