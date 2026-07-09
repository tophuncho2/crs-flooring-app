import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { requireRankAtLeast } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { WarehouseCreateClient } from "@/modules/warehouse/components/record/warehouse-create-client"

export default async function WarehouseCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <WarehouseCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/warehouse")}
    />
  )
}
