"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  formatTemplateItemsCount,
  type ManagementCompanyOption,
  type PropertyOption,
  type TemplateDetail,
  type TemplateOption,
} from "@builders/domain"
import {
  useCascadePickerController,
  type CascadePickerController,
  type CascadePickerInitialSelections,
  type CascadePickerSteps,
} from "@/engines/picker"
import type { PickerListOption } from "@/engines/picker"
import { buildPropertyRecordHref, buildTemplateHubHref } from "@/hooks/navigation"
import {
  MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY,
  searchManagementCompanyOptionsRequest,
} from "@/modules/management-companies/data/management-company-options-request"
import {
  PROPERTY_OPTIONS_QUERY_KEY,
  searchPropertyOptionsRequest,
} from "@/modules/properties/data/property-options-request"
import {
  TEMPLATE_OPTIONS_QUERY_KEY,
  searchTemplateOptionsRequest,
} from "@/modules/templates/data/template-options-request"
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

function managementCompanyToOption(option: ManagementCompanyOption): PickerListOption {
  return { id: option.id, title: option.name }
}

function propertyToOption(option: PropertyOption): PickerListOption {
  return { id: option.id, title: option.name, subtitle: option.address || null }
}

function templateToOption(option: TemplateOption): PickerListOption {
  return {
    id: option.id,
    title: option.unitType || "—",
    subtitles: [option.jobTypeName, option.description].filter(
      (value): value is string => Boolean(value && value.trim().length > 0),
    ),
    meta: formatTemplateItemsCount(option.itemsCount),
  }
}

export type TemplateHubController = {
  cascade: CascadePickerController
  steps: CascadePickerSteps
  /** Full record for the selected template, or null while none is loaded. */
  templateDetail: TemplateDetail | null
  isTemplateLoading: boolean
  templateError: string | null
  // ===== Actions =====
  clear: () => void
  newTemplate: () => void
  openManagementCompany: (managementCompanyId: string) => void
  openProperty: (propertyId: string, managementCompanyId: string | null) => void
}

/**
 * Controller for the template hub — the single templates page. Composes the
 * shared cascade picker (Management Company → Property → Template), wires each
 * step's data request, loads the full editable template record when one is
 * selected, pre-sets the pickers from that loaded record, mirrors the selection
 * into the URL (`?templateId=…`, shallow), and owns the page-level actions.
 */
export function useTemplateHubController(
  options: {
    initialSelections?: TemplateHubInitialSelections
    initialTemplate?: TemplateDetail | null
  } = {},
): TemplateHubController {
  const { initialSelections, initialTemplate } = options
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnToParam = searchParams.get("returnTo")
  const cascade = useCascadePickerController({ initialSelections })

  const { managementCompanyId, propertyId, templateId } = cascade

  const steps = useMemo<CascadePickerSteps>(
    () => ({
      managementCompany: {
        bucketKey: MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY,
        pagedSearchFn: (search, signal, skip) =>
          searchManagementCompanyOptionsRequest(search, signal, { skip }),
        toOption: managementCompanyToOption,
        searchPlaceholder: "Search companies",
      },
      property: {
        // Bucket per management-company so cache results stay scoped to the parent filter.
        bucketKey: [...PROPERTY_OPTIONS_QUERY_KEY, managementCompanyId ?? null],
        pagedSearchFn: (search, signal, skip) =>
          searchPropertyOptionsRequest(search, signal, {
            managementCompanyId: managementCompanyId ?? undefined,
            skip,
          }),
        toOption: propertyToOption,
        searchPlaceholder: "Search properties",
      },
      template: {
        bucketKey: [...TEMPLATE_OPTIONS_QUERY_KEY, propertyId ?? null],
        pagedSearchFn: (search, signal, skip) =>
          searchTemplateOptionsRequest(search, signal, {
            propertyId: propertyId ?? "",
            skip,
          }),
        toOption: templateToOption,
        searchPlaceholder: "Search templates",
      },
    }),
    [managementCompanyId, propertyId],
  )

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

  const openManagementCompany = useCallback(
    (id: string) => {
      router.push(`/dashboard/management-companies/${id}`)
    },
    [router],
  )

  const openProperty = useCallback(
    (id: string, mcId: string | null) => {
      router.push(buildPropertyRecordHref(id, mcId, pathname))
    },
    [router, pathname],
  )

  return {
    cascade,
    steps,
    templateDetail,
    isTemplateLoading,
    templateError,
    clear,
    newTemplate,
    openManagementCompany,
    openProperty,
  }
}
