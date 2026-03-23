import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireContactsAccess } from "@/features/flooring/shared/access/lookup-domains"
import ContactsClient from "@/features/flooring/contacts/components/list/contacts-client"
import { getContactsPageData } from "@/features/flooring/contacts/data/queries"

export default async function ContactsPage() {
  await requireContactsAccess()
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

  return <ContactsClient initialContacts={result.data.contacts} />
}
