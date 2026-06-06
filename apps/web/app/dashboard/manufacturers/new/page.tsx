import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { ManufacturerCreateClient } from "@/modules/manufacturers/components/record/manufacturer-create-client"

export default async function ManufacturerCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <ManufacturerCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/manufacturers")}
    />
  )
}
