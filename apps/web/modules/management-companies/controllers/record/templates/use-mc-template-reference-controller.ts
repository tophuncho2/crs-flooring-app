"use client"

import { useCallback } from "react"
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

export type McTemplateReferenceController = {
  cascade: CascadePickerController
  /** Full record for the selected template, or null while none is loaded. */
  templateDetail: TemplateDetail | null
  isTemplateLoading: boolean
  templateError: string | null
  /** Clear the property + template selection, keeping the locked MC. */
  clear: () => void
}

/**
 * Controller for the MC record view's templates reference section. A trimmed
 * sibling of `useTemplateHubController`: it seeds the shared cascade picker with
 * the host MC (which never changes — we're already inside that company, so the
 * UI hides the MC picker), loads the full template record when one is selected,
 * and exposes a property+template Clear that keeps the MC locked.
 *
 * Deliberately omits the hub controller's `window.history.replaceState` URL
 * mirroring — the MC page owns its own `?property=` drilldown param, so the
 * selected template stays in local state for this first (read-only) pass rather
 * than competing for the URL.
 */
export function useMcTemplateReferenceController({
  managementCompanyId,
  managementCompanyLabel,
}: {
  managementCompanyId: string
  managementCompanyLabel: string | null
}): McTemplateReferenceController {
  const cascade = useCascadePickerController({
    initialSelections: { managementCompanyId, managementCompanyLabel },
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

  // Clear only the downstream selection — `seed` applies with no cascade
  // side-effects, and omitting the `managementCompany` key leaves the locked MC
  // in place (a full `cascade.reset()` would wipe it).
  const seed = cascade.seed
  const clear = useCallback(() => {
    seed({ property: null, template: null })
  }, [seed])

  return { cascade, templateDetail, isTemplateLoading, templateError, clear }
}
