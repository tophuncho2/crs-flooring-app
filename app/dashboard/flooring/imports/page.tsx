import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import ImportsClient from "@/features/flooring/imports/components/imports-client"
import { getImportsPageData } from "@/features/flooring/imports/queries"

export default async function FlooringImportsPage() {
  await requireToolAccess("warehouse")
  const result = await getImportsPageData()

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

  const pageData = result.data

  return (
    <ImportsClient
      initialImports={pageData.initialImports}
      productOptions={pageData.productOptions}
      warehouseOptions={pageData.warehouseOptions}
      locationOptions={pageData.locationOptions}
    />
  )
}
