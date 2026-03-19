import { requireToolAccess } from "@/server/auth/session"
import { getPropertiesPageData } from "@/features/flooring/properties/queries"
import PropertiesClient from "@/features/flooring/properties/components/properties-client"

export default async function FlooringPropertiesPage() {
  await requireToolAccess("warehouse")
  const pageData = await getPropertiesPageData()

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
