import { canEditCategories } from "@/server/auth/access-control"
import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireCategoriesAccess } from "@/features/flooring/shared/access/lookup-domains"
import CategoriesClient from "@/features/flooring/categories/components/list/categories-client"
import { getCategoriesPageData } from "@/features/flooring/categories/data/queries"

export default async function FlooringCategoriesPage() {
  const user = await requireCategoriesAccess()
  const pageData = await getCategoriesPageData()

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
    />
  )
}
