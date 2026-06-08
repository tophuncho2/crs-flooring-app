import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { TemplateCreateClient } from "@/modules/templates/components/record/template-create-client"

export default async function TemplateCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const propertyId = typeof resolvedSearchParams?.propertyId === "string" ? resolvedSearchParams.propertyId : undefined

  return (
    <TemplateCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/templates")}
      initialPropertyId={propertyId}
    />
  )
}
