import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { ContactCreateClient } from "@/modules/contacts/components/record/contact-create-client"

export default async function ContactCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <ContactCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/contacts")}
    />
  )
}
