import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { buildPageHref, parsePageParam } from "@/server/pagination"
import { getInventoryPageData } from "@/features/flooring/inventory/queries"
import InventoryClient from "@/features/flooring/inventory/components/inventory-client"

export default async function FlooringInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const result = await getInventoryPageData(page)

  if (!result.ok) {
    return (
      <DashboardErrorState
        title={result.error.title}
        message={result.error.message}
        detail={result.error.detail}
        errorCode={result.error.code}
      />
    )
  }

  return (
    <InventoryClient
      initialInventory={result.data.initialInventory}
      pagination={{
        ...result.data.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/inventory", result.data.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/inventory", result.data.pagination.page + 1),
      }}
    />
  )
}
