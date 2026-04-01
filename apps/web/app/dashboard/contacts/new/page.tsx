import { requireContactsAccess } from "@/modules/shared/access/lookup-domains"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { ContactCreateClient } from "@/modules/contacts/record/create/contact-create-client"

export default async function ContactCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireContactsAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <ContactCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/contacts")}
    />
  )
}
