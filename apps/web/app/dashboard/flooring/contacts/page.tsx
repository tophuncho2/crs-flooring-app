import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireContactsAccess } from "@/features/flooring/shared/access/lookup-domains"
import ContactsClient from "@/features/flooring/contacts/components/list/contacts-client"
import { getContactsPageData } from "@/features/flooring/contacts/data/queries"
import { getResolvedUserTablePreference } from "@/server/account/table-preferences"
import { parseServerTableQueryState } from "@/server/pagination"

export default async function ContactsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireContactsAccess()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "contacts-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["type"],
    allowedGroupKeys: ["type"],
  })
  const result = await getContactsPageData()

  if (!result.ok) {
    return (
      <DashboardErrorState
        title={result.error.title}
        message={result.error.message}
        detail={result.error.detail}
        errorCode={result.error.code}
      />
    )
  }

  return <ContactsClient initialContacts={result.data.contacts} initialTablePreferences={initialTablePreferences} tableState={tableState} />
}
