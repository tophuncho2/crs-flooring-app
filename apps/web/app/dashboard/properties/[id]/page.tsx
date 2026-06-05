import { notFound, redirect } from "next/navigation"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { buildPropertyRecordHref } from "@/hooks/navigation/routes"
import { getPropertyById } from "@/modules/properties/data/queries"

/**
 * Properties no longer have a standalone record page — they live inside their
 * management company's record view. This route is kept only to resolve old
 * links/bookmarks: it looks up the property's MC and redirects into the MC view
 * (drilled into the property), or the MC create flow when the property has none.
 */
export default async function PropertyDetailRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const returnTo = resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/properties")

  const property = await getPropertyById(id).catch(() => null)
  if (!property) {
    notFound()
  }

  redirect(buildPropertyRecordHref(id, property.managementCompany?.id ?? null, returnTo))
}
