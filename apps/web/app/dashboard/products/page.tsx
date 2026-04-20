import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { getResolvedUserTablePreference } from "@builders/application"
import { parseServerTableQueryState } from "@/server/pagination"
import FlooringProductsClient from "@/modules/products/components/list/products-client"
import { getProductsPageData } from "@/modules/products/data/queries"

export default async function FlooringProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("products")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "products-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    allowedGroupKeys: ["category", "manufacturer", "style", "color"],
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["category"],
  })
  const result = await getProductsPageData()

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
    <FlooringProductsClient
      initialProducts={result.data}
      initialTablePreferences={initialTablePreferences}
      tableState={tableState}
    />
  )
}
