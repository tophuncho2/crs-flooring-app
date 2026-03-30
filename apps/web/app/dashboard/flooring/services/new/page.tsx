import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireServicesAccess } from "@/features/flooring/shared/access/lookup-domains"
import { resolveReturnTo } from "@/features/flooring/shared/record-page/detail-routes"
import { getServiceCreatePageData } from "@/features/flooring/services/data/queries"
import { ServiceCreateClient } from "@/features/flooring/services/record/create/service-create-client"

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
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/services")}
    />
  )
}
