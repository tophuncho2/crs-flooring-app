"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import type { TemplateDetail, TemplateListRow, TemplateOption } from "@builders/domain"
import {
  useCascadePickerController,
  type CascadePickerController,
  type CascadePickerInitialSelections,
} from "@/engines/picker"
import { buildTemplateHubHref } from "@/hooks/navigation"
import {
  TEMPLATE_DETAIL_QUERY_KEY,
  fetchTemplateDetailRequest,
} from "@/modules/templates/data/template-detail-request"

const TEMPLATE_HUB_BASE = "/dashboard/templates/edit"

/**
 * Cascade preset threaded in from the hub page's search params (deep links +
 * the list / MC / work-order hand-offs). Re-uses the engine's selection shape.
 */
export type TemplateHubInitialSelections = CascadePickerInitialSelections

/**
 * Map a clicked list row to the cascade controller's leaf-step option. The
 * templates picker grid surfaces full `TemplateListRow`s; the cascade controller
 * only needs the `TemplateOption` subset to record the selection + label.
 */
export function toTemplateOption(row: TemplateListRow): TemplateOption {
  return {
    id: row.id,
    unitType: row.unitType,
    jobTypeName: row.jobTypeName,
    description: row.description,
    itemsCount: row.itemsCount,
  }
}

export type TemplateHubController = {
  cascade: CascadePickerController
  /** Full record for the selected template, or null while none is loaded. */
  templateDetail: TemplateDetail | null
  isTemplateLoading: boolean
  templateError: string | null
  // ===== Actions =====
  clear: () => void
  newTemplate: () => void
}

/**
 * Controller for the template hub — the single templates page. Composes the
 * shared cascade picker (Management Company → Property → Template), loads the
 * full editable template record when one is selected, pre-sets the pickers from
 * that loaded record, mirrors the selection into the URL (`?templateId=…`,
 * shallow), and owns the page-level actions. The reference-header UI drives the
 * cascade through standalone MC/Property pickers + a clickable templates table;
 * the cascade controller still owns clear-downstream + auto-link MC.
 */
export function useTemplateHubController(
  options: {
    initialSelections?: TemplateHubInitialSelections
    initialTemplate?: TemplateDetail | null
  } = {},
): TemplateHubController {
  const { initialSelections, initialTemplate } = options
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnToParam = searchParams.get("returnTo")
  const cascade = useCascadePickerController({ initialSelections })

  const { managementCompanyId, propertyId, templateId } = cascade

  const templateQuery = useQuery({
    queryKey: [...TEMPLATE_DETAIL_QUERY_KEY, templateId],
    queryFn: ({ signal }) => fetchTemplateDetailRequest(templateId!, signal),
    enabled: templateId !== null,
    // Seed once and keep stable so the record panel below isn't reseeded (and
    // unsaved edits aren't clobbered) by a background refetch.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    initialData:
      initialTemplate && initialTemplate.id === templateId ? initialTemplate : undefined,
  })

  const templateDetail = templateId !== null ? templateQuery.data ?? null : null
  const isTemplateLoading = templateId !== null && templateQuery.isLoading
  const templateError =
    templateId !== null && templateQuery.isError
      ? templateQuery.error instanceof Error
        ? templateQuery.error.message
        : "Failed to load template."
      : null

  // Pre-set the pickers from the loaded template (covers entry points that pass
  // only a templateId — the work-order arrow, create redirect). Once per id so
  // it never clobbers a later manual picker change.
  const seed = cascade.seed
  const seededRef = useRef<string | null>(null)
  useEffect(() => {
    if (!templateDetail) return
    if (seededRef.current === templateDetail.id) return
    seededRef.current = templateDetail.id
    seed({
      managementCompany: templateDetail.managementCompanyId
        ? { id: templateDetail.managementCompanyId, label: templateDetail.managementCompanyName }
        : null,
      property: { id: templateDetail.propertyId, label: templateDetail.propertyName },
      template: { id: templateDetail.id, label: templateDetail.unitType },
    })
  }, [templateDetail, seed])

  // Mirror the current selection into the URL (shallow — no RSC round-trip) so
  // refresh / share / back stay coherent with the in-page pickers.
  useEffect(() => {
    if (typeof window === "undefined") return
    const target = buildTemplateHubHref({
      templateId: cascade.templateId,
      templateLabel: cascade.templateLabel,
      propertyId: cascade.propertyId,
      propertyLabel: cascade.propertyLabel,
      managementCompanyId: cascade.managementCompanyId,
      managementCompanyLabel: cascade.managementCompanyLabel,
      returnTo: returnToParam,
    })
    const current = `${window.location.pathname}${window.location.search}`
    if (target !== current) {
      window.history.replaceState(window.history.state, "", target)
    }
  }, [
    cascade.templateId,
    cascade.templateLabel,
    cascade.propertyId,
    cascade.propertyLabel,
    cascade.managementCompanyId,
    cascade.managementCompanyLabel,
    returnToParam,
  ])

  const clear = useCallback(() => {
    cascade.reset()
  }, [cascade])

  const newTemplate = useCallback(() => {
    const params = new URLSearchParams()
    if (propertyId) params.set("propertyId", propertyId)
    if (managementCompanyId) params.set("managementCompanyId", managementCompanyId)
    params.set("returnTo", TEMPLATE_HUB_BASE)
    router.push(`/dashboard/templates/new?${params.toString()}`)
  }, [managementCompanyId, propertyId, router])

  return {
    cascade,
    templateDetail,
    isTemplateLoading,
    templateError,
    clear,
    newTemplate,
  }
}
