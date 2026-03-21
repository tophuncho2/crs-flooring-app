import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/flooring/shared/detail-routes"
import { getWarehouseById } from "@/features/flooring/warehouse/queries"
import { WarehouseDetailClient } from "@/features/flooring/warehouse/components/warehouse-detail-client"

export default async function WarehouseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const pageData = await getWarehouseById(id)

    return (
      <WarehouseDetailClient
        warehouse={pageData.warehouse}
        sections={pageData.sections}
        locations={pageData.locations}
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/warehouse")}
      />
    )
  } catch {
    notFound()
  }
}
