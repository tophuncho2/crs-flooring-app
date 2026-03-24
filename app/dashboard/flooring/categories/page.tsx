import { canEditCategories } from "@/server/auth/access-control"
import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireCategoriesAccess } from "@/features/flooring/shared/access/lookup-domains"
import CategoriesClient from "@/features/flooring/categories/components/list/categories-client"
import { getCategoriesPageData } from "@/features/flooring/categories/data/queries"
import { getUserTablePreference } from "@/server/account/table-preferences"

export default async function FlooringCategoriesPage() {
  const user = await requireCategoriesAccess()
  const [pageData, initialTablePreferences] = await Promise.all([
    getCategoriesPageData(),
    getUserTablePreference(user.id, "categories-main"),
  ])

  if (!pageData.ok) {
    return (
      <DashboardErrorState
        title={pageData.error.title}
        message={pageData.error.message}
        detail={pageData.error.detail}
        errorCode={pageData.error.code}
      />
    )
  }

  return (
    <CategoriesClient
      canManage={canEditCategories(user.role)}
      initialCategories={pageData.data.initialCategories}
      unitOfMeasureOptions={pageData.data.unitOfMeasureOptions}
      initialTablePreferences={initialTablePreferences}
    />
  )
}
