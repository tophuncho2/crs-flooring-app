import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getInventoryPageData } from "@/modules/inventory/data/queries"
import InventoryClient from "@/modules/inventory/components/list/inventory-client"

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
