import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireCategoriesAccess } from "@/features/flooring/shared/access/lookup-domains"
import { resolveReturnTo } from "@/features/flooring/shared/record-page/detail-routes"
import { getCategoryCreatePageData } from "@/features/flooring/categories/data/queries"
import { CategoryCreateClient } from "@/features/flooring/categories/record/create/category-create-client"

export default async function CategoryCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireCategoriesAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getCategoryCreatePageData()

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
    <CategoryCreateClient
      unitOfMeasureOptions={result.data.unitOfMeasureOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/categories")}
    />
  )
}
