import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { EntityCreateClient } from "@/modules/entities/components/record/entity-create-client"
import { PropertyHubCreateClient } from "@/modules/entities/components/record/properties/property-hub-create-client"

/**
 * The single create entry point for the entity ⇄ property pair. With a `?property`
 * id in tow this is the orphan-property → new-entity link flow (create the entity, link
 * the existing property); without one it's the unified hub create (a property,
 * optionally with a linked or newly-created entity).
 */
export default async function EntityCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const propertyId =
    typeof resolvedSearchParams?.property === "string" ? resolvedSearchParams.property : undefined
  const entityId =
    typeof resolvedSearchParams?.entityId === "string"
      ? resolvedSearchParams.entityId
      : undefined
  const entityLabel =
    typeof resolvedSearchParams?.entityLabel === "string"
      ? resolvedSearchParams.entityLabel
      : null
  const backHref = resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/properties")

  return propertyId ? (
    <EntityCreateClient propertyId={propertyId} backHref={backHref} />
  ) : (
    <PropertyHubCreateClient
      backHref={backHref}
      initialEntity={
        entityId ? { id: entityId, label: entityLabel } : null
      }
    />
  )
}
