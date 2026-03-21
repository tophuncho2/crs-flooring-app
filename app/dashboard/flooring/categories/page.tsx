import { canEditCategories } from "@/server/auth/access-control"
import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import CategoriesClient from "@/features/flooring/categories/components/categories-client"
import { getCategoriesPageData } from "@/features/flooring/categories/queries"

export default async function FlooringCategoriesPage() {
  const user = await requireToolAccess("products")
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
