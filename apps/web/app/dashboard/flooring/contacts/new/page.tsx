import { requireContactsAccess } from "@/features/flooring/shared/access/lookup-domains"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { ContactCreateClient } from "@/features/flooring/contacts/record/create/contact-create-client"

export default async function ContactCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireContactsAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <ContactCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/contacts")}
    />
  )
}
