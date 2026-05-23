import type { ImportOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const IMPORTS_OPTIONS_QUERY_KEY = ["imports", "options"] as const

export type ImportsOptionsPage = {
  items: ImportOption[]
  hasMore: boolean
}

export type ImportsOptionsRequestArgs = {
  /** Required scope — server validates non-empty. */
  warehouseId: string
  skip?: number
  take?: number
}

export async function searchImportOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: ImportsOptionsRequestArgs,
): Promise<ImportsOptionsPage> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (search) params.set("search", search)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 50))
  const url = `/api/imports/options?${params.toString()}`
  return requestJson<ImportsOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
