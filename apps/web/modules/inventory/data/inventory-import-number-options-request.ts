import type { InventoryImportNumberOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_IMPORT_NUMBER_OPTIONS_QUERY_KEY = [
  "inventory",
  "options",
  "imports",
] as const

export type InventoryImportNumberOptionsRequestArgs = {
  /** Required scope — server validates non-empty. */
  warehouseId: string
  /**
   * Mirrors the inventory list's archive segmented control so the chip's
   * options reflect the current list scope (active / archived / both).
   */
  isArchived?: boolean
  take?: number
}

export type InventoryImportNumberOptionsResponse = {
  options: InventoryImportNumberOption[]
}

export async function searchInventoryImportNumberOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: InventoryImportNumberOptionsRequestArgs,
): Promise<InventoryImportNumberOption[]> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (args.isArchived !== undefined) {
    params.set("archived", args.isArchived ? "true" : "false")
  }
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/inventory/options/imports?${params.toString()}`
  const result = await requestJson<InventoryImportNumberOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
