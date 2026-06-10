import type { ContactOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const CONTACT_OPTIONS_QUERY_KEY = ["contacts", "options"] as const

export type ContactOptionsResponse = {
  options: ContactOption[]
}

export type ContactOptionsRequestArgs = {
  take?: number
}

export async function searchContactOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: ContactOptionsRequestArgs = {},
): Promise<ContactOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/contacts/options?${params.toString()}`
  const result = await requestJson<ContactOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
