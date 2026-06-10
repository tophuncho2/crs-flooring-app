"use client"

import { useQuery } from "@tanstack/react-query"
import type { TemplateDetail } from "@builders/domain"
import {
  useCascadePickerController,
  type CascadePickerController,
} from "@/engines/picker"
import {
  TEMPLATE_DETAIL_QUERY_KEY,
  fetchTemplateDetailRequest,
} from "@/modules/templates/data/template-detail-request"

export type TemplateReferenceSectionController = {
  cascade: CascadePickerController
  /** Full record for the selected template, or null while none is loaded. */
  templateDetail: TemplateDetail | null
  isTemplateLoading: boolean
  templateError: string | null
}

/**
 * Controller for the shared templates reference section consumed by the MC and
 * property record views. A trimmed sibling of `useTemplateHubController`: it
 * seeds the shared cascade picker with the host scope (always a management
 * company; optionally a property when the property record view fixes one),
 * then loads the full template record when one is selected.
 *
 * Selectability (which seeded pickers the operator may change) and the Clear
 * semantics live in the consuming component — this controller only owns the
 * seeded cascade + the selected template's detail query. It deliberately omits
 * the hub controller's `window.history.replaceState` URL mirroring: the host
 * page owns the URL, so the previewed template stays in local state.
 */
export function useTemplateReferenceSection({
  managementCompanyId,
  managementCompanyLabel,
  propertyId = null,
  propertyLabel = null,
}: {
  managementCompanyId: string
  managementCompanyLabel: string | null
  propertyId?: string | null
  propertyLabel?: string | null
}): TemplateReferenceSectionController {
  const cascade = useCascadePickerController({
    initialSelections: {
      managementCompanyId,
      managementCompanyLabel,
      propertyId,
      propertyLabel,
    },
  })
  const { templateId } = cascade

  const templateQuery = useQuery({
    queryKey: [...TEMPLATE_DETAIL_QUERY_KEY, templateId],
    queryFn: ({ signal }) => fetchTemplateDetailRequest(templateId!, signal),
    enabled: templateId !== null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const templateDetail = templateId !== null ? templateQuery.data ?? null : null
  const isTemplateLoading = templateId !== null && templateQuery.isLoading
  const templateError =
    templateId !== null && templateQuery.isError
      ? templateQuery.error instanceof Error
        ? templateQuery.error.message
        : "Failed to load template."
      : null

  return { cascade, templateDetail, isTemplateLoading, templateError }
}
