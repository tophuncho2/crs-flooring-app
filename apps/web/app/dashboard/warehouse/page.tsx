import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import WarehouseClient from "@/modules/warehouse/components/list/warehouse-client"
import { getWarehousePageData } from "@/modules/warehouse/data/queries"

export default async function FlooringWarehousePage() {
  await requireToolAccess("warehouse")
  const pageData = await getWarehousePageData()

  if (!pageData.ok) {
    return (
      <DashboardErrorState
        title={pageData.error.title}
        message={pageData.error.message}
        detail={pageData.error.detail}
        errorCode={pageData.error.code}
      />
    )
  }

  return <WarehouseClient initialRows={pageData.data} />
}
