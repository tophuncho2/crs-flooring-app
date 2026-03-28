import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { notFound } from "next/navigation"
import { getTemplateDetailPageData } from "@/features/flooring/templates/queries"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { requireTemplatesAccess } from "@/features/flooring/shared/access/templates-work-orders"
import { TemplateDetailClient } from "@/features/flooring/templates/components/template-detail-client"

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireTemplatesAccess()
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getTemplateDetailPageData(id)

  if (!result.ok) {
    if ("notFound" in result && result.notFound) {
      notFound()
    }

    if (!("error" in result)) {
      notFound()
    }

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
    <TemplateDetailClient
      template={result.data.template}
      propertyOptions={result.data.propertyOptions}
      warehouseOptions={result.data.warehouseOptions}
      padProductOptions={result.data.padProductOptions}
      productOptions={result.data.productOptions}
      serviceOptions={result.data.serviceOptions}
      salesRepOptions={result.data.salesRepOptions}
      unitOptions={result.data.unitOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/templates")}
    />
  )
}
