import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/flooring/shared/detail-routes"
import { listInventoryRows } from "@/features/flooring/inventory/api"
import { ProductDetailClient } from "@/features/flooring/products/components/product-detail-client"
import { getProductById, getProductsPageData } from "@/features/flooring/products/queries"

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("products")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const [product, pageData, inventoryRows] = await Promise.all([
      getProductById(id),
      getProductsPageData(1, {
        searchQuery: "",
        isAscendingSort: false,
        isGroupingEnabled: false,
        groupByKeys: [],
      }),
      listInventoryRows(undefined, id),
    ])

    return (
      <ProductDetailClient
        initialProduct={product}
        categoryOptions={pageData.categoryOptions}
        manufacturerOptions={pageData.manufacturerOptions}
        inventoryRows={inventoryRows}
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/products")}
      />
    )
  } catch {
    notFound()
  }
}
