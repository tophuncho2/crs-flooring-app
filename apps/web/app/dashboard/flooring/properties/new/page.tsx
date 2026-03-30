import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { getPropertyCreatePageOptions } from "@/features/flooring/properties/queries"
import { PropertyCreateClient } from "@/features/flooring/properties/record/create/property-create-client"

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
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/properties")}
    />
  )
}
