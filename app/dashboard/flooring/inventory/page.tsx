import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getInventoryPageData } from "@/features/flooring/inventory/queries"
import InventoryClient from "@/features/flooring/inventory/components/inventory-client"

export default async function FlooringInventoryPage() {
  await requireToolAccess("warehouse")
  const result = await getInventoryPageData()

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

  return <InventoryClient initialInventory={result.data.initialInventory} />
}
