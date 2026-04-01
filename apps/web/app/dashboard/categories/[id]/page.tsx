import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { canEditCategories } from "@/server/auth/access-control"
import { requireCategoriesAccess } from "@/modules/shared/access/lookup-domains"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { CategoryDetailClient } from "@/modules/categories/record/detail/category-detail-client"
import { getCategoryDetailPageData } from "@builders/db"

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
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/categories")}
    />
  )
}
