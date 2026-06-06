import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { WarehouseCreateClient } from "@/modules/warehouse/components/record/warehouse-create-client"

export default async function WarehouseCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <WarehouseCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/warehouse")}
    />
  )
}
