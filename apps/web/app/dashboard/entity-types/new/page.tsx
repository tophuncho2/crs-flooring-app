import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { EntityTypeCreateClient } from "@/modules/entity-types/components/record/entity-type-create-client"

export default async function EntityTypeCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <EntityTypeCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/entity-types")}
    />
  )
}
