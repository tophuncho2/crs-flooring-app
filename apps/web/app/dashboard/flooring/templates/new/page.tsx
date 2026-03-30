import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireTemplatesAccess } from "@/features/flooring/shared/access/templates-work-orders"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { getTemplateCreatePageOptions } from "@/features/flooring/templates/queries"
import { TemplateCreateClient } from "@/features/flooring/templates/record/create/template-create-client"

export default async function TemplateCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireTemplatesAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getTemplateCreatePageOptions()
  const propertyId = typeof resolvedSearchParams?.propertyId === "string" ? resolvedSearchParams.propertyId : ""

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

  return (
    <TemplateCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/templates")}
      propertyOptions={result.data.propertyOptions}
      warehouseOptions={result.data.warehouseOptions}
      padProductOptions={result.data.padProductOptions}
      initialPropertyId={propertyId}
    />
  )
}
