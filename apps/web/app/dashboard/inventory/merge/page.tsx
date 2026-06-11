import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { InventoryMergeClient } from "@/modules/inventory/components/record/merge/inventory-merge-client"

/**
 * The "merge inventory" flow. Opened from the inventory list's "Merge" toolbar
 * action (under "+ Inventory"). No source to load — the user picks a product,
 * batch-selects the rows of that product to consolidate (warehouse-agnostic),
 * and fills the editable cells of the new row; a successful merge routes to the
 * new consolidated item's own record page.
 */
export default async function InventoryMergePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <InventoryMergeClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/inventory")}
    />
  )
}
