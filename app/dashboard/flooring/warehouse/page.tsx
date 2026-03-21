import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import WarehouseClient from "@/features/flooring/warehouse/components/warehouse-client"
import { getWarehousePageData } from "@/features/flooring/warehouse/queries"

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
