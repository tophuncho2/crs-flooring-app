import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireManufacturersAccess } from "@/features/flooring/shared/access/lookup-domains"
import ManufacturersClient from "@/features/flooring/manufacturers/components/list/manufacturers-client"
import { getManufacturersPageData } from "@/features/flooring/manufacturers/data/queries"

export default async function ManufacturersPage() {
  await requireManufacturersAccess()
  const result = await getManufacturersPageData()

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
    <ManufacturersClient
      initialManufacturers={result.data}
    />
  )
}
