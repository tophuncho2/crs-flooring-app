import { notFound } from "next/navigation"
import type { ManagementCompanyDetail } from "@builders/domain"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getPropertyById } from "@/modules/properties/data/queries"
import { getManagementCompanyById } from "@/modules/management-companies/data/queries"
import { PropertyDetailClient } from "@/modules/properties/components/record/property-detail-client"

function readParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const value = searchParams?.[key]
  return typeof value === "string" ? value : undefined
}

/**
 * The standalone Property record view. The selected property rides in the query
 * string (`?propertyId=…`), set by every property entry point (the list, the MC
 * record view's property list, the WO/template "✎ Property" buttons). The page
 * loads the property and — for the read-only linked-company section — its
 * management company.
 */
export default async function PropertyRecordPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolved = searchParams ? await searchParams : undefined

  const propertyId = readParam(resolved, "propertyId")
  if (!propertyId) notFound()

  const property = await getPropertyById(propertyId).catch(() => null)
  if (!property) notFound()

  let managementCompany: ManagementCompanyDetail | null = null
  if (property.managementCompany) {
    managementCompany = await getManagementCompanyById(property.managementCompany.id).catch(
      () => null,
    )
  }

  return (
    <PropertyDetailClient
      property={property}
      managementCompany={managementCompany}
      backHref={resolveReturnTo(resolved?.returnTo, "/dashboard/properties")}
    />
  )
}
