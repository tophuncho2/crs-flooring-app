import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { ImportCreateClient } from "@/modules/imports/components/record/import-create-client"

export default async function ImportCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <ImportCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/imports")}
    />
  )
}
