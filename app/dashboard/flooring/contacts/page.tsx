import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireContactsAccess } from "@/features/flooring/shared/access/lookup-domains"
import ContactsClient from "@/features/flooring/contacts/components/list/contacts-client"
import { getContactsPageData } from "@/features/flooring/contacts/data/queries"
import { getUserTablePreference } from "@/server/account/table-preferences"

export default async function ContactsPage() {
  const user = await requireContactsAccess()
  const [result, initialTablePreferences] = await Promise.all([
    getContactsPageData(),
    getUserTablePreference(user.id, "contacts-main"),
  ])

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

  return <ContactsClient initialContacts={result.data.contacts} initialTablePreferences={initialTablePreferences} />
}
