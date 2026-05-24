import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import CategoriesClient from "@/modules/categories/components/list/categories-client"
import { getCategoriesPageData } from "@/modules/categories/data/queries"

export default async function FlooringCategoriesPage() {
  await requireSessionUser()
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

  return <CategoriesClient initialRows={pageData.data} />
}
