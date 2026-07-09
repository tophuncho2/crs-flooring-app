import type { Metadata } from "next"
import { notFound } from "next/navigation"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import { InventoryPrintConfigurator } from "@/modules/inventory/components/record/print/inventory-print-configurator"
import { getInventoryDetailPageData } from "@/modules/inventory/data/queries"
import { getBrandLogoPrintUrl } from "@/server/storage/s3"

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

  const logoUrl = await getBrandLogoPrintUrl()

  // The printed document is the inventory record sheet; adjustments export to CSV.
  return (
    <InventoryPrintConfigurator
      inventory={result.data.inventory}
      logoUrl={logoUrl}
      previousInventoryId={result.data.inventory.previousInventory?.id ?? null}
      nextInventoryId={result.data.inventory.nextInventory?.id ?? null}
    />
  )
}
