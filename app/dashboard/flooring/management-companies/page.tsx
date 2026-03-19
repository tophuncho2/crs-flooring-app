import { requireToolAccess } from "@/server/auth/session"
import { getManagementCompaniesPageData } from "@/features/flooring/management-companies/queries"
import ManagementCompaniesClient from "@/features/flooring/management-companies/components/management-companies-client"

export default async function ManagementCompaniesPage() {
  await requireToolAccess("warehouse")
  const pageData = await getManagementCompaniesPageData()

  return (
    <ManagementCompaniesClient
      initialCompanies={pageData.initialCompanies}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      padProductOptions={pageData.padProductOptions}
      productOptions={pageData.productOptions}
      serviceOptions={pageData.serviceOptions}
      unitOptions={pageData.unitOptions}
    />
  )
}
