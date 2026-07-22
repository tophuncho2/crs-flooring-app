import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { requireRankAtLeast } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { InventoryAgeIndicatorCreateClient } from "@/modules/inventory-age-indicators/components/record/inventory-age-indicator-create-client"

export default async function InventoryAgeIndicatorCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <InventoryAgeIndicatorCreateClient
      backHref={resolveReturnTo(
        resolvedSearchParams?.returnTo,
        "/dashboard/inventory-age-indicators",
      )}
    />
  )
}
