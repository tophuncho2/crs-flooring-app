import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { PropertyHubCreateClient } from "@/modules/properties/components/record/property-hub-create-client"

export default async function PropertyCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <PropertyHubCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/properties")}
    />
  )
}
