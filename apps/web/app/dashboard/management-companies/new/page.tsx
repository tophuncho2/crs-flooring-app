import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation/routes"
import { ManagementCompanyCreateClient } from "@/modules/management-companies/components/record/management-company-create-client"

export default async function ManagementCompanyCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <ManagementCompanyCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/management-companies")}
    />
  )
}
