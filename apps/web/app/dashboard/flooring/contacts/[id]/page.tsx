import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireContactsAccess } from "@/features/flooring/shared/access/lookup-domains"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { ContactDetailClient } from "@/features/flooring/contacts/components/detail/contact-detail-client"
import { getContactDetailPageData } from "@/features/flooring/contacts/data/queries"

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireContactsAccess()
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getContactDetailPageData(id)

  if (!result.ok) {
    if ("notFound" in result && result.notFound) {
      notFound()
    }

    if (!("error" in result)) {
      notFound()
    }

    return (
      <DashboardErrorState
        title={result.error.title}
        message={result.error.message}
        detail={result.error.detail}
        errorCode={result.error.code}
      />
    )
  }

  return (
    <ContactDetailClient
      contact={result.data.contact}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/contacts")}
    />
  )
}
