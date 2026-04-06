import { normalizeTableFilterValues } from "@builders/domain"
import type { TableFilterPreferenceMap } from "./table-preferences"

export type TableFilterOption = {
  value: string
  label: string
}

export type TableFilterDefinition = {
  key: string
  param: string
  type: "tabs" | "select"
  label: string
  clearLabel?: string
  options: TableFilterOption[]
}

export type TableFilterState = TableFilterPreferenceMap

function coerceRequestedFilterValues(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string")
  }

  if (typeof value === "string") {
    return [value]
  }

  return []
}

export function createInitialTableFilterState(definitions: TableFilterDefinition[], initialFilters?: TableFilterState) {
  return Object.fromEntries(
    definitions.map((definition) => {
      const allowedValues = new Set(definition.options.map((option) => option.value))
      const requestedValues = coerceRequestedFilterValues(initialFilters?.[definition.key])
      return [
        definition.key,
        Array.from(
          new Set(
            requestedValues.filter((value): value is string => typeof value === "string" && allowedValues.has(value)),
          ),
        ),
      ]
    }),
  )
}

export function buildAllowedFilterValues(definitions: TableFilterDefinition[]) {
  return Object.fromEntries(
    definitions.map((definition) => [definition.key, definition.options.map((option) => option.value)]),
  )
}

export { normalizeTableFilterValues } from "@builders/domain"

export function buildFilterSearchParams(
  currentSearchParams: URLSearchParams,
  definitions: TableFilterDefinition[],
  nextFilters: TableFilterState,
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams)

  nextSearchParams.delete("page")

  for (const definition of definitions) {
    nextSearchParams.delete(definition.param)
    const values = nextFilters[definition.key] ?? []

    for (const value of values) {
      nextSearchParams.append(definition.param, value)
    }
  }

  return nextSearchParams
}

export function parseServerTableFilterState<TFilterState extends TableFilterState = TableFilterState>({
  searchParams,
  definitions,
  preferenceFilters = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>
  definitions: TableFilterDefinition[]
  preferenceFilters?: TableFilterState
}): TFilterState {
  return Object.fromEntries(
    definitions.map((definition) => {
      const allowedValues = new Set(definition.options.map((option) => option.value))
      const rawSearchParam = searchParams?.[definition.param]
      const rawValues: string[] = Array.isArray(rawSearchParam)
        ? rawSearchParam
        : typeof rawSearchParam === "string"
          ? [rawSearchParam]
          : []
      const requestedValues = normalizeTableFilterValues(rawValues.map((value) => value.trim()))
        .filter((value) => allowedValues.has(value))
      const preferredValues = normalizeTableFilterValues(coerceRequestedFilterValues(preferenceFilters[definition.key]))
        .filter((value) => allowedValues.has(value))

      if (requestedValues.length > 0) {
        return [definition.key, requestedValues]
      }

      if (preferredValues.length > 0) {
        return [definition.key, preferredValues]
      }

      return [definition.key, []]
    }),
  ) as TFilterState
}
