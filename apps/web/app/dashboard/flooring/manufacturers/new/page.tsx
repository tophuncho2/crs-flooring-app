import { requireManufacturersAccess } from "@/features/flooring/shared/access/lookup-domains"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { ManufacturerCreateClient } from "@/features/flooring/manufacturers/record/create/manufacturer-create-client"

export default async function ManufacturerCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireManufacturersAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <ManufacturerCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/manufacturers")}
    />
  )
}
