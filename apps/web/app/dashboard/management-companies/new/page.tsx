import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { ManagementCompanyCreateClient } from "@/modules/management-companies/components/record/management-company-create-client"
import { PropertyHubCreateClient } from "@/modules/management-companies/components/record/properties/property-hub-create-client"

/**
 * The single create entry point for the MC ⇄ property pair. With a `?property`
 * id in tow this is the orphan-property → new-MC link flow (create the MC, link
 * the existing property); without one it's the unified hub create (a property,
 * optionally with a linked or newly-created MC).
 */
export default async function ManagementCompanyCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const propertyId =
    typeof resolvedSearchParams?.property === "string" ? resolvedSearchParams.property : undefined
  const backHref = resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/properties")

  return propertyId ? (
    <ManagementCompanyCreateClient propertyId={propertyId} backHref={backHref} />
  ) : (
    <PropertyHubCreateClient backHref={backHref} />
  )
}
