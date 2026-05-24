import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { WorkOrderCreateClient } from "@/modules/work-orders/components/record/work-order-create-client"

export default async function WorkOrderCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <WorkOrderCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/work-orders")}
    />
  )
}
