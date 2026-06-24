import type { EntityTypeOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const ENTITY_TYPE_OPTIONS_QUERY_KEY = ["entity-types", "options"] as const

export type EntityTypeOptionsPage = {
  items: EntityTypeOption[]
  hasMore: boolean
}

export type EntityTypeOptionsRequestArgs = {
  skip?: number
  take?: number
}

export async function searchEntityTypeOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: EntityTypeOptionsRequestArgs = {},
): Promise<EntityTypeOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 50))
  const url = `/api/entity-types/options?${params.toString()}`
  return requestJson<EntityTypeOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
