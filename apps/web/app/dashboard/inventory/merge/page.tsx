import { redirect } from "next/navigation"
import { requireSessionUser } from "@/server/auth/session"

/**
 * Merge retired from the UI (2026-06-18) pending the inventory-costing work. The
 * toolbar button is gone and this page is sealed — any direct navigation
 * redirects to the inventory list. The merge client + `/api/inventory/merge` +
 * `mergeInventoryUseCase` stay dormant; restore the original loader (render
 * `InventoryMergeClient` with the resolved `returnTo` backHref) to re-enable.
 */
export default async function InventoryMergePage() {
  await requireSessionUser()
  redirect("/dashboard/inventory")
}
