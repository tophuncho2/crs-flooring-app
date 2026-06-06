import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireSessionUser } from "@/server/auth/session"
import {
  buildInventoryRecordHref,
  resolveRecordEntryReturnTo as resolveReturnTo,
} from "@/hooks/navigation"
import { getInventoryDetailPageData } from "@/modules/inventory/data/queries"
import { InventoryDuplicateClient } from "@/modules/inventory/components/record/duplicate/inventory-duplicate-client"

function readParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const value = searchParams?.[key]
  return typeof value === "string" ? value : undefined
}

/**
 * The "duplicate inventory" create flow. The source item rides in the query
 * string (`?sourceId=…`); it's loaded server-side so the form can render the
 * source row read-only beneath the editable fields. Opened from the inventory
 * record view's "Duplicate" action; a successful create routes to the new
 * item's own record page.
 */
export default async function InventoryDuplicatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolved = searchParams ? await searchParams : undefined

  const sourceId = readParam(resolved, "sourceId")
  if (!sourceId) notFound()

  const result = await getInventoryDetailPageData(sourceId)
  if (!result.ok) {
    if ("notFound" in result && result.notFound) notFound()
    if (!("error" in result)) notFound()
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
    <InventoryDuplicateClient
      backHref={resolveReturnTo(
        resolved?.returnTo,
        buildInventoryRecordHref({ inventoryId: sourceId }),
      )}
      source={result.data.inventory}
    />
  )
}
