import { notFound } from "next/navigation"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { ManagementCompanyCreateClient } from "@/modules/management-companies/components/record/management-company-create-client"

export default async function ManagementCompanyCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const propertyId =
    typeof resolvedSearchParams?.property === "string" ? resolvedSearchParams.property : undefined

  // The MC create flow always links a property — without one there's nothing to
  // create against.
  if (!propertyId) {
    notFound()
  }

  return (
    <ManagementCompanyCreateClient
      propertyId={propertyId}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/properties")}
    />
  )
}
