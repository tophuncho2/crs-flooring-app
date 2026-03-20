import { requireToolAccess } from "@/server/auth/session"
import { buildPageHref, parsePageParam, parseServerTableQueryState } from "@/server/pagination"
import FlooringProductsClient from "@/features/flooring/products/components/products-client"
import { getProductsPageData } from "@/features/flooring/products/queries"

export default async function FlooringProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("products")
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const page = parsePageParam(resolvedSearchParams?.page)
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    allowedGroupKeys: ["category", "manufacturer", "style", "color", "baseColor"],
    defaultGroupKeys: ["category"],
  })
  const pageData = await getProductsPageData(page, tableState)

  return (
    <FlooringProductsClient
      key={`products-${pageData.pagination.page}-${pageData.tableState.searchQuery}-${pageData.tableState.isAscendingSort}-${pageData.tableState.isGroupingEnabled}-${pageData.tableState.groupByKeys.join(",")}`}
      {...pageData}
      pagination={{
        ...pageData.pagination,
        previousPageHref: buildPageHref("/dashboard/flooring/products", pageData.pagination.page - 1),
        nextPageHref: buildPageHref("/dashboard/flooring/products", pageData.pagination.page + 1),
      }}
    />
  )
}
