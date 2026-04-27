"use client"

import { withMutationMeta } from "@/transport/mutation"
import type { TableFilterPreferenceMap, TablePreferencePayload } from "@builders/domain"

export type TablePreferencePatch = Partial<TablePreferencePayload>

export type TablePreferencePatchOptions = {
  tableKey: string
  state: TablePreferencePatch
  allowedColumnKeys?: string[]
  allowedSortKeys?: string[]
  allowedGroupKeys?: string[]
  allowedFilterValues?: Record<string, string[]>
  signal?: AbortSignal
}

export async function patchTablePreference({
  tableKey,
  state,
  allowedColumnKeys,
  allowedSortKeys,
  allowedGroupKeys,
  allowedFilterValues,
  signal,
}: TablePreferencePatchOptions) {
  const requestAbortController = new AbortController()
  const abortFromExternalSignal = () => requestAbortController.abort()
  const timeoutId = window.setTimeout(() => requestAbortController.abort(), 5000)

  if (signal?.aborted) {
    requestAbortController.abort()
  } else if (signal) {
    signal.addEventListener("abort", abortFromExternalSignal, { once: true })
  }

  try {
    const response = await fetch(`/api/account/table-preferences/${tableKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      signal: requestAbortController.signal,
      body: JSON.stringify(withMutationMeta({
        state,
        ...(allowedColumnKeys ? { allowedColumnKeys } : {}),
        ...(allowedSortKeys ? { allowedSortKeys } : {}),
        ...(allowedGroupKeys ? { allowedGroupKeys } : {}),
        ...(allowedFilterValues ? { allowedFilterValues } : {}),
      })),
    })
    const payload = (await response.json().catch(() => ({}))) as { error?: string }

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to save table preferences")
    }
  } finally {
    window.clearTimeout(timeoutId)
    if (signal) {
      signal.removeEventListener("abort", abortFromExternalSignal)
    }
  }
}

export function normalizeTableFilters(value: unknown): TableFilterPreferenceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, rawValue]) => {
      if (Array.isArray(rawValue)) {
        const values = rawValue.filter((entry): entry is string => typeof entry === "string")
        return values.length > 0 ? [[key, values] as const] : []
      }

      if (typeof rawValue === "string" && rawValue.length > 0) {
        return [[key, [rawValue]] as const]
      }

      return []
    }),
  )
}
