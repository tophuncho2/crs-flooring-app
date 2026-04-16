import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireCategoriesAccess } from "@/modules/shared/access/lookup-domains"
import CategoriesClient from "@/modules/categories/components/list/categories-client"
import { getCategoriesPageData } from "@/modules/categories/data/queries"
import { getResolvedUserTablePreference } from "@builders/application"
import { parseServerTableQueryState } from "@/server/pagination"

export default async function FlooringCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireCategoriesAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "categories-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
  })
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
      initialCategories={pageData.data}
      initialTablePreferences={initialTablePreferences}
      tableState={tableState}
    />
  )
}
