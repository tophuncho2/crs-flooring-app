import { notFound } from "next/navigation"
import type { EntityDetail } from "@builders/domain"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getPropertyById } from "@/modules/properties/data/queries"
import { getEntityById } from "@/modules/entities/data/queries"
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
 * string (`?propertyId=…`), set by every property entry point (the list, the entity
 * record view's property list, the WO/template "✎ Property" buttons). The page
 * loads the property and — for the read-only linked-entity section — its
 * entity.
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

  let entity: EntityDetail | null = null
  if (property.entity) {
    entity = await getEntityById(property.entity.id, { withNeighbors: false }).catch(
      () => null,
    )
  }

  return (
    <PropertyDetailClient
      property={property}
      entity={entity}
      backHref={resolveReturnTo(resolved?.returnTo, "/dashboard/properties")}
    />
  )
}
