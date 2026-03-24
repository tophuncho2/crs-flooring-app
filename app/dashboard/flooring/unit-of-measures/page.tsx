import { canEditUnitOfMeasures } from "@/server/auth/access-control"
import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireUnitOfMeasuresAccess } from "@/features/flooring/shared/access/lookup-domains"
import UnitOfMeasuresClient from "@/features/flooring/unit-of-measures/components/list/unit-of-measures-client"
import { getUnitOfMeasuresPageData } from "@/features/flooring/unit-of-measures/data/queries"
import { getUserTablePreference } from "@/server/account/table-preferences"

export default async function UnitOfMeasuresPage() {
  const user = await requireUnitOfMeasuresAccess()
  const [pageData, initialTablePreferences] = await Promise.all([
    getUnitOfMeasuresPageData(),
    getUserTablePreference(user.id, "unit-of-measures-main"),
  ])

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
      initialTablePreferences={initialTablePreferences}
    />
  )
}
