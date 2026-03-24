export type TableFilterOption = {
  value: string
  label: string
}

export type TableFilterDefinition = {
  key: string
  param: string
  type: "tabs" | "select"
  label?: string
  defaultValue: string
  options: TableFilterOption[]
}

export type TableFilterState = Record<string, string>

export function createInitialTableFilterState(definitions: TableFilterDefinition[], initialFilters?: TableFilterState) {
  return Object.fromEntries(
    definitions.map((definition) => {
      const allowedValues = new Set(definition.options.map((option) => option.value))
      const requestedValue = initialFilters?.[definition.key]
      return [
        definition.key,
        requestedValue && allowedValues.has(requestedValue) ? requestedValue : definition.defaultValue,
      ]
    }),
  )
}

export function buildAllowedFilterValues(definitions: TableFilterDefinition[]) {
  return Object.fromEntries(
    definitions.map((definition) => [definition.key, definition.options.map((option) => option.value)]),
  )
}

export function buildFilterSearchParams(
  currentSearchParams: URLSearchParams,
  definitions: TableFilterDefinition[],
  nextFilters: TableFilterState,
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams)

  nextSearchParams.delete("page")

  for (const definition of definitions) {
    const value = nextFilters[definition.key] ?? definition.defaultValue

    if (value === definition.defaultValue) {
      nextSearchParams.delete(definition.param)
    } else {
      nextSearchParams.set(definition.param, value)
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
      const rawValue = Array.isArray(searchParams?.[definition.param]) ? searchParams?.[definition.param]?.[0] : searchParams?.[definition.param]
      const requestedValue = typeof rawValue === "string" ? rawValue.trim() : ""
      const preferredValue = preferenceFilters[definition.key] ?? ""
      const allowedValues = new Set(definition.options.map((option) => option.value))

      if (requestedValue && allowedValues.has(requestedValue)) {
        return [definition.key, requestedValue]
      }

      if (preferredValue && allowedValues.has(preferredValue)) {
        return [definition.key, preferredValue]
      }

      return [definition.key, definition.defaultValue]
    }),
  ) as TFilterState
}
