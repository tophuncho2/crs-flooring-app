import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireCategoriesAccess } from "@/modules/shared/access/lookup-domains"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getCategoryCreatePageData } from "@builders/db"
import { CategoryCreateClient } from "@/modules/categories/record/create/category-create-client"

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
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/categories")}
    />
  )
}
