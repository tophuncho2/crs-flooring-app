import { requireManageUsersAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { InviteCreateClient } from "@/modules/invites/components/record/invite-create-client"

export default async function InviteCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireManageUsersAccess()

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const loginUrl = `${(process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "")}/login`

  return (
    <InviteCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/invites")}
      actorRank={actor.rank}
      loginUrl={loginUrl}
    />
  )
}
