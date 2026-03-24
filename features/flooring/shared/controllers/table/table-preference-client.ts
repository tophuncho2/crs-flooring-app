"use client"

import type { TableFilterPreferenceMap, TablePreferencePayload } from "./table-preferences"

export type TablePreferencePatch = Partial<TablePreferencePayload>

export type TablePreferencePatchOptions = {
  tableKey: string
  patch: TablePreferencePatch
  allowedColumnKeys?: string[]
  allowedGroupKeys?: string[]
  allowedFilterValues?: Record<string, string[]>
}

export async function patchTablePreference({
  tableKey,
  patch,
  allowedColumnKeys,
  allowedGroupKeys,
  allowedFilterValues,
}: TablePreferencePatchOptions) {
  const response = await fetch(`/api/account/table-preferences/${tableKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...patch,
      ...(allowedColumnKeys ? { allowedColumnKeys } : {}),
      ...(allowedGroupKeys ? { allowedGroupKeys } : {}),
      ...(allowedFilterValues ? { allowedFilterValues } : {}),
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to save table preferences")
  }
}

export function normalizeTableFilters(value: unknown): TableFilterPreferenceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"),
  )
}
