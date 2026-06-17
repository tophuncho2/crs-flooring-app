import type { InventoryDetail } from "@builders/domain"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getInventoryDetailPageData } from "@/modules/inventory/data/queries"
import { InventoryDetailClient } from "@/modules/inventory/components/record/inventory-detail-client"

function readParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const value = searchParams?.[key]
  return typeof value === "string" ? value : undefined
}

/**
 * The inventory record view. The selected item rides in the query string
 * (`?inventoryId=…`), chosen by the Warehouse → Inventory pickers in the header.
 * Opened from the inventory list/ledger with the item pre-selected, or empty
 * with the operator picking warehouse → inventory in the header.
 */
export default async function InventoryRecordPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolved = searchParams ? await searchParams : undefined

  // Deep-linked inventory renders without a client round-trip when it loads
  // cleanly; otherwise the client fetches it (or surfaces the error) on mount.
  const inventoryId = readParam(resolved, "inventoryId")
  let initialInventory: InventoryDetail | null = null
  if (inventoryId) {
    const result = await getInventoryDetailPageData(inventoryId)
    if (result.ok) initialInventory = result.data.inventory
  }

  return (
    <InventoryDetailClient
      backHref={resolveReturnTo(resolved?.returnTo, "/dashboard/inventory")}
      initialInventory={initialInventory}
    />
  )
}
