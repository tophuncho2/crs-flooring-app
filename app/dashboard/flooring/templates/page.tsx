import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getTemplatesPageData } from "@/features/flooring/templates/queries"
import TemplatesClient from "@/features/flooring/templates/components/templates-client"

export default async function TemplatesPage() {
  await requireToolAccess("warehouse")
  const result = await getTemplatesPageData()

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
    <TemplatesClient
      initialTemplates={pageData.initialTemplates}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      padProductOptions={pageData.padProductOptions}
      productOptions={pageData.productOptions}
      serviceOptions={pageData.serviceOptions}
      unitOptions={pageData.unitOptions}
    />
  )
}
