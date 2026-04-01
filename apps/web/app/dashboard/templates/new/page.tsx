import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireTemplatesAccess } from "@/modules/shared/access/templates-work-orders"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getTemplateCreatePageOptions } from "@/modules/templates/queries"
import { TemplateCreateClient } from "@/modules/templates/record/create/template-create-client"

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
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/templates")}
      propertyOptions={result.data.propertyOptions}
      warehouseOptions={result.data.warehouseOptions}
      padProductOptions={result.data.padProductOptions}
      initialPropertyId={propertyId}
    />
  )
}
