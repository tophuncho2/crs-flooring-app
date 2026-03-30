"use client"

export type RecordSectionType = "field" | "item" | "calculation" | "chart"

export type RecordSectionCapabilities = {
  editable?: boolean
  supportsAddRow?: boolean
  supportsRouteAdd?: boolean
  supportsNestedAllocations?: boolean
  supportsOpenRow?: boolean
  supportsRemoveRow?: boolean
  supportsStatusColumn?: boolean
  supportsSaveDiscard?: boolean
  supportsMetrics?: boolean
  supportsSummary?: boolean
  supportsEmptyState?: boolean
}

const DEFAULT_CAPABILITIES: Record<RecordSectionType, Required<RecordSectionCapabilities>> = {
  field: {
    editable: true,
    supportsAddRow: false,
    supportsRouteAdd: false,
    supportsNestedAllocations: false,
    supportsOpenRow: false,
    supportsRemoveRow: false,
    supportsStatusColumn: false,
    supportsSaveDiscard: true,
    supportsMetrics: true,
    supportsSummary: true,
    supportsEmptyState: false,
  },
  item: {
    editable: false,
    supportsAddRow: false,
    supportsRouteAdd: false,
    supportsNestedAllocations: false,
    supportsOpenRow: false,
    supportsRemoveRow: false,
    supportsStatusColumn: false,
    supportsSaveDiscard: false,
    supportsMetrics: true,
    supportsSummary: true,
    supportsEmptyState: true,
  },
  calculation: {
    editable: false,
    supportsAddRow: false,
    supportsRouteAdd: false,
    supportsNestedAllocations: false,
    supportsOpenRow: false,
    supportsRemoveRow: false,
    supportsStatusColumn: false,
    supportsSaveDiscard: false,
    supportsMetrics: true,
    supportsSummary: true,
    supportsEmptyState: true,
  },
  chart: {
    editable: false,
    supportsAddRow: false,
    supportsRouteAdd: false,
    supportsNestedAllocations: false,
    supportsOpenRow: false,
    supportsRemoveRow: false,
    supportsStatusColumn: false,
    supportsSaveDiscard: false,
    supportsMetrics: true,
    supportsSummary: true,
    supportsEmptyState: true,
  },
}

export function resolveRecordSectionCapabilities(
  sectionType: RecordSectionType,
  capabilities?: RecordSectionCapabilities,
) {
  return {
    ...DEFAULT_CAPABILITIES[sectionType],
    ...capabilities,
  } satisfies Required<RecordSectionCapabilities>
}
