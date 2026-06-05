import type { TemplateDetail } from "@builders/domain"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getTemplateDetailPageData } from "@/modules/templates/data/queries"
import { TemplateSyncPageClient } from "@/modules/template-sync/components/template-sync-page-client"
import type { TemplateSyncInitialSelections } from "@/modules/template-sync/controllers/use-template-sync-controller"

function readParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const value = searchParams?.[key]
  return typeof value === "string" ? value : undefined
}

export default async function TemplateSyncPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const initialSelections: TemplateSyncInitialSelections = {
    managementCompanyId: readParam(resolvedSearchParams, "managementCompanyId") ?? null,
    managementCompanyLabel: readParam(resolvedSearchParams, "managementCompanyLabel") ?? null,
    propertyId: readParam(resolvedSearchParams, "propertyId") ?? null,
    propertyLabel: readParam(resolvedSearchParams, "propertyLabel") ?? null,
    templateId: readParam(resolvedSearchParams, "templateId") ?? null,
    templateLabel: readParam(resolvedSearchParams, "templateLabel") ?? null,
  }

  // Deep-linked template renders without a client round-trip when it loads
  // cleanly; otherwise the client fetches it (or surfaces the error) on mount.
  let initialTemplate: TemplateDetail | null = null
  if (initialSelections.templateId) {
    const result = await getTemplateDetailPageData(initialSelections.templateId)
    if (result.ok) initialTemplate = result.data.template
  }

  return (
    <TemplateSyncPageClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/work-orders")}
      initialSelections={initialSelections}
      initialTemplate={initialTemplate}
    />
  )
}
