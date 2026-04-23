import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getPropertyCreatePageOptions } from "@/modules/properties/data/queries"
import { PropertyCreateClient } from "@/modules/properties/record/create/property-create-client"

export default async function PropertyCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getPropertyCreatePageOptions()
  const managementCompanyId = typeof resolvedSearchParams?.managementCompanyId === "string"
    ? resolvedSearchParams.managementCompanyId
    : ""

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
    <PropertyCreateClient
      managementOptions={result.data.managementOptions}
      initialManagementCompanyId={managementCompanyId}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/properties")}
    />
  )
}
