import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireUnitOfMeasuresAccess } from "@/modules/shared/access/lookup-domains"
import UnitOfMeasuresClient from "@/modules/unit-of-measures/components/list/unit-of-measures-client"
import { getUnitOfMeasuresPageData } from "@/modules/unit-of-measures/data/queries"

export default async function UnitOfMeasuresPage() {
  await requireUnitOfMeasuresAccess()
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

  return <UnitOfMeasuresClient initialRows={pageData.data} />
}
