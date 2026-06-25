import type { EntityOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const ENTITY_OPTIONS_QUERY_KEY = ["entities", "options"] as const

export type EntityOptionsPage = {
  items: EntityOption[]
  hasMore: boolean
}

export type EntityOptionsRequestArgs = {
  /** Optional entity-type narrowing — repeated `typeId` params (m2m some/in). */
  typeIds?: ReadonlyArray<string>
  skip?: number
  take?: number
}

export async function searchEntityOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: EntityOptionsRequestArgs = {},
): Promise<EntityOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  for (const typeId of args.typeIds ?? []) params.append("typeId", typeId)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 50))
  const url = `/api/entities/options?${params.toString()}`
  return requestJson<EntityOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
