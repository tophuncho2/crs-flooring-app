import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getInventoryDetailPageData } from "@/modules/inventory/data/queries"
import {
  InventoryCreateClient,
  type InventoryCreateSeed,
} from "@/modules/inventory/components/record/create/inventory-create-client"

function readParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const value = searchParams?.[key]
  return typeof value === "string" ? value : undefined
}

/**
 * The "create inventory row" flow. Opened blank from the inventory list's
 * "+ Inventory" toolbar action, or pre-filled when seeded from a source row via
 * `?sourceId=` (the row's / record view's "Duplicate" action). When seeded, the
 * source is loaded server-side and its fields seed the create form — the user
 * edits and saves through the normal create endpoint, which inserts a brand-new
 * row. A successful create routes to the new item's own record page.
 */
export default async function InventoryCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const backHref = resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/inventory")
  const sourceId = readParam(resolvedSearchParams, "sourceId")
  // Split-off mode seeds Starting Stock from the adjustment quantity (carried in
  // `qty`) rather than the source's live balance, and labels the blue header
  // "Split off …". Everything else mirrors the duplicate seed.
  const isSplitOff = readParam(resolvedSearchParams, "mode") === "split-off"
  const splitQty = readParam(resolvedSearchParams, "qty")

  // Fresh create — no source to seed from.
  if (!sourceId) {
    return <InventoryCreateClient backHref={backHref} />
  }

  // Seeded create — load the source row and pre-fill the form (duplicate or split-off).
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

  const source = result.data.inventory
  const seed: InventoryCreateSeed = {
    form: {
      productId: source.productId,
      warehouseId: source.warehouseId,
      rollNumber: source.rollNumber,
      dyeLot: source.dyeLot,
      note: source.note,
      // Split-off: seed starting stock from the split quantity (the adjustment
      // amount). Duplicate: seed from the source's live stock balance (not its
      // original starting stock) so the copy carries the live quantity. Both
      // remain editable on the form.
      startingStock: isSplitOff ? (splitQty ?? "") : source.stockBalance,
      location: source.location,
      internalNotes: source.internalNotes,
    },
    productLabel: source.productName,
    warehouseLabel: source.warehouseName,
    stockUnitAbbrev: source.stockUnitAbbrev,
  }

  return (
    <InventoryCreateClient
      backHref={backHref}
      seed={seed}
      title={isSplitOff ? "Split off" : "Duplicate"}
    />
  )
}
