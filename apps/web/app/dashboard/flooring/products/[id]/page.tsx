import DashboardErrorState from "@/features/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { ProductDetailClient } from "@/features/flooring/products/record/detail/product-detail-client"
import { getProductDetailPageData } from "@/features/flooring/products/data/queries"

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
  const result = await getProductDetailPageData(id)

  if (!result.ok) {
    if ("notFound" in result && result.notFound) {
      notFound()
    }
    if (!("error" in result)) {
      notFound()
    }

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
    <ProductDetailClient
      initialProduct={result.data.product}
      categoryOptions={result.data.categoryOptions}
      manufacturerOptions={result.data.manufacturerOptions}
      inventoryRows={result.data.inventoryRows}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/products")}
    />
  )
}
