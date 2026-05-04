import type { JobTypeOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const JOB_TYPE_OPTIONS_QUERY_KEY = ["job-types", "options"] as const

export type JobTypeOptionsResponse = {
  options: JobTypeOption[]
}

export type JobTypeOptionsRequestArgs = {
  take?: number
}

export async function searchJobTypeOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: JobTypeOptionsRequestArgs = {},
): Promise<JobTypeOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/job-types/options?${params.toString()}`
  const result = await requestJson<JobTypeOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
