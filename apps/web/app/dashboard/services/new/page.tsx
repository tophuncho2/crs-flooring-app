import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireServicesAccess } from "@/modules/shared/access/lookup-domains"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getServiceCreatePageData } from "@/modules/services/data/queries"
import { ServiceCreateClient } from "@/modules/services/record/create/service-create-client"

export default async function ServiceCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireServicesAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getServiceCreatePageData()

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
    <ServiceCreateClient
      unitOptions={result.data.unitOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/services")}
    />
  )
}
