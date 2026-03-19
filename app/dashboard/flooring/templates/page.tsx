import { requireToolAccess } from "@/server/auth/session"
import { getTemplatesPageData } from "@/features/flooring/templates/queries"
import TemplatesClient from "@/features/flooring/templates/components/templates-client"

export default async function TemplatesPage() {
  await requireToolAccess("warehouse")
  const pageData = await getTemplatesPageData()

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
