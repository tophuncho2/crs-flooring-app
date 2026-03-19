import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getPropertiesPageData } from "@/features/flooring/properties/queries"
import PropertiesClient from "@/features/flooring/properties/components/properties-client"

export default async function FlooringPropertiesPage() {
  await requireToolAccess("warehouse")
  const result = await getPropertiesPageData()

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
    <PropertiesClient
      initialProperties={pageData.initialProperties}
      managementOptions={pageData.managementOptions}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      padProductOptions={pageData.padProductOptions}
      productOptions={pageData.productOptions}
      serviceOptions={pageData.serviceOptions}
      unitOptions={pageData.unitOptions}
    />
  )
}
