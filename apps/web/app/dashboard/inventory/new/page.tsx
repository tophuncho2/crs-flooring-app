import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { InventoryCreateClient } from "@/modules/inventory/components/record/create/inventory-create-client"

/**
 * The manual "create inventory row" flow. Opened from the inventory list's
 * "+ Inventory" toolbar action. No source to load — the user picks a product +
 * warehouse and fills the editable fields; a successful create routes to the
 * new item's own record page.
 */
export default async function InventoryCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <InventoryCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/inventory")}
    />
  )
}
