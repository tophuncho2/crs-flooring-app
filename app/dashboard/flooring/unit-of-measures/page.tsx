import { requireToolAccess } from "@/server/auth/session"
import { canEditUnitOfMeasures } from "@/server/auth/access-control"
import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import UnitOfMeasuresClient from "@/features/flooring/unit-of-measures/components/unit-of-measures-client"
import { getUnitOfMeasuresPageData } from "@/features/flooring/unit-of-measures/queries"

export default async function UnitOfMeasuresPage() {
  const user = await requireToolAccess("products")
  const pageData = await getUnitOfMeasuresPageData()

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

  return (
    <UnitOfMeasuresClient
      canManage={canEditUnitOfMeasures(user.role)}
      initialUnitOfMeasures={pageData.data}
    />
  )
}
