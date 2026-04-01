import DashboardErrorState from "@/features/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { getProductCreatePageData } from "@/features/flooring/products/data/queries"
import { ProductCreateClient } from "@/features/flooring/products/record/create/product-create-client"

export default async function ProductCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("products")

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const options = await getProductCreatePageData()

    return (
      <ProductCreateClient
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/products")}
        categoryOptions={options.categoryOptions}
        manufacturerOptions={options.manufacturerOptions}
      />
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "The product create form could not be loaded."

    return (
      <DashboardErrorState
        title="Product Form Unavailable"
        message="The app could not load the product create form."
        detail={message}
        errorCode="PRODUCT_CREATE_LOAD_FAILED"
      />
    )
  }
}
