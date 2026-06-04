import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getProductCreatePageData } from "@/modules/products/data/queries"
import { ProductCreateClient } from "@/modules/products/components/record/product-create-client"

export default async function ProductCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const options = await getProductCreatePageData()

    return (
      <ProductCreateClient
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/products")}
        categoryOptions={options.categoryOptions}
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
