import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { JobTypeCreateClient } from "@/modules/job-types/components/record/job-type-create-client"

export default async function JobTypeCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <JobTypeCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/job-types")}
    />
  )
}
