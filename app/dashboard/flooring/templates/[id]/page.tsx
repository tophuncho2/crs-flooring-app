import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { getTemplateById } from "@/features/flooring/templates/queries"
import { loadTemplatePanelOptions } from "@/features/flooring/shared/template-panel-options"
import { prisma } from "@/server/db/prisma"
import { resolveReturnTo } from "@/features/flooring/shared/detail-routes"
import { TemplateDetailClient } from "@/features/flooring/templates/components/template-detail-client"

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("templates")
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  try {
    const [template, propertyOptions, templatePanelOptions] = await Promise.all([
      getTemplateById(id),
      prisma.property.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      loadTemplatePanelOptions(),
    ])

    return (
      <TemplateDetailClient
        template={template}
        propertyOptions={propertyOptions}
        warehouseOptions={templatePanelOptions.warehouseOptions}
        padProductOptions={templatePanelOptions.padProductOptions}
        productOptions={templatePanelOptions.productOptions}
        serviceOptions={templatePanelOptions.serviceOptions}
        unitOptions={templatePanelOptions.unitOptions}
        backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/templates")}
      />
    )
  } catch {
    notFound()
  }
}
