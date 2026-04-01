import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { WarehouseCreateClient } from "@/modules/warehouse/record/create/warehouse-create-client"

export default async function WarehouseCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <WarehouseCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/warehouse")}
    />
  )
}
