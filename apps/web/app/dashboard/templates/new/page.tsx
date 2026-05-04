import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { TemplateCreateClient } from "@/modules/templates/components/record/template-create-client"

export default async function TemplateCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("templates")
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <TemplateCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/templates")}
    />
  )
}
