import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { getImportCreatePageData } from "@/features/flooring/imports/data/queries"
import { ImportCreateClient } from "@/features/flooring/imports/record/create/import-create-client"

export default async function ImportCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const options = await getImportCreatePageData()

    return (
      <ImportCreateClient
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/imports")}
        warehouseOptions={options.warehouseOptions}
      />
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "The import create form could not be loaded."

    return (
      <DashboardErrorState
        title="Import Form Unavailable"
        message="The app could not load the import create form."
        detail={message}
        errorCode="IMPORT_CREATE_LOAD_FAILED"
      />
    )
  }
}
