import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/flooring/shared/detail-routes"
import InventoryClient from "@/features/flooring/inventory/components/inventory-client"
import { getInventoryById } from "@/features/flooring/inventory/queries"
import { listInventoryLocationOptions } from "@/features/flooring/inventory/api"

export default async function InventoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const [inventory, locationOptions] = await Promise.all([
      getInventoryById(id),
      listInventoryLocationOptions(),
    ])

    return (
      <InventoryClient
        initialInventory={[inventory]}
        locationOptions={locationOptions}
        tableState={{
          searchQuery: "",
          isAscendingSort: false,
          isGroupingEnabled: false,
          groupByKeys: [],
        }}
        detailRecordId={inventory.id}
        detailReturnHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/inventory")}
      />
    )
  } catch {
    notFound()
  }
}
