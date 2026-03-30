import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { ManagementCompanyCreateClient } from "@/features/flooring/management-companies/record/create/management-company-create-client"

export default async function ManagementCompanyCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <ManagementCompanyCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/management-companies")}
    />
  )
}
