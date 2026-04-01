import { requireManufacturersAccess } from "@/modules/shared/access/lookup-domains"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { ManufacturerCreateClient } from "@/modules/manufacturers/record/create/manufacturer-create-client"

export default async function ManufacturerCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireManufacturersAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <ManufacturerCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/manufacturers")}
    />
  )
}
