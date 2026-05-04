import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getTemplateCreatePageOptions } from "@/modules/templates/data/queries"
import { TemplateCreateClient } from "@/modules/templates/components/record/template-create-client"

export default async function TemplateCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("templates")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getTemplateCreatePageOptions()

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
      warehouseOptions={result.data.warehouseOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/templates")}
    />
  )
}
