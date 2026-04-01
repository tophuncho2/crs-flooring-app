import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { notFound } from "next/navigation"
import { canEditCategories } from "@/server/auth/access-control"
import { requireCategoriesAccess } from "@/features/flooring/shared/access/lookup-domains"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { CategoryDetailClient } from "@/features/flooring/categories/record/detail/category-detail-client"
import { getCategoryDetailPageData } from "@/features/flooring/categories/data/queries"

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireCategoriesAccess()
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getCategoryDetailPageData(id)

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
    <CategoryDetailClient
      category={result.data.category}
      unitOfMeasureOptions={result.data.unitOfMeasureOptions}
      canManage={canEditCategories(user.role)}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/categories")}
    />
  )
}
