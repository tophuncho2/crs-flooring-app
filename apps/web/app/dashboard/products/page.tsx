import { requireToolAccess } from "@/server/auth/session"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"
import { buildPageHrefWithSearchParams, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import FlooringProductsClient from "@/modules/products/components/products-client"
import { getProductsPageData } from "@/modules/products/data/queries"

export default async function FlooringProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireToolAccess("products")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "products-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    allowedGroupKeys: ["category", "manufacturer", "style", "color", "baseColor"],
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["category"],
  })
  const pageData = await getProductsPageData(page, tableState)

  return (
    <FlooringProductsClient
      key={`products-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}`}
      {...pageData}
      initialTablePreferences={initialTablePreferences}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHrefWithSearchParams("/dashboard/products", pageData.pagination.page - 1, resolvedSearchParams),
        nextPageHref: buildPageHrefWithSearchParams("/dashboard/products", pageData.pagination.page + 1, resolvedSearchParams),
      }}
    />
  )
}
