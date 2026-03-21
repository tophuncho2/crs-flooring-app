import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/flooring/shared/detail-routes"
import { loadTemplatePanelOptions } from "@/features/flooring/shared/template-panel-options"
import { getPropertyById } from "@/features/flooring/properties/queries"
import { prisma } from "@/server/db/prisma"
import { PropertyDetailClient } from "@/features/flooring/properties/components/property-detail-client"

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("properties")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const [property, managementOptions, templatePanelOptions] = await Promise.all([
      getPropertyById(id),
      prisma.flooringManagementCompany.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      loadTemplatePanelOptions(),
    ])

    return (
      <PropertyDetailClient
        property={property}
        managementOptions={managementOptions}
        warehouseOptions={templatePanelOptions.warehouseOptions}
        padProductOptions={templatePanelOptions.padProductOptions}
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/properties")}
      />
    )
  } catch {
    notFound()
  }
}
