import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
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
    selectedManagementCompanyLabel:
      readParam(resolvedSearchParams, "managementCompanyLabel") ?? null,
    propertyId: readParam(resolvedSearchParams, "propertyId") ?? null,
    selectedPropertyLabel: readParam(resolvedSearchParams, "propertyLabel") ?? null,
    templateId: readParam(resolvedSearchParams, "templateId") ?? null,
    selectedTemplateLabel: readParam(resolvedSearchParams, "templateLabel") ?? null,
  }

  return (
    <TemplateSyncPageClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/work-orders")}
      initialSelections={initialSelections}
    />
  )
}
