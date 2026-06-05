"use client"

import { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
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
} from "@/engines/cascade-picker"
import type { HubSidePanelPickerOption } from "@/components/hub-side-panel"
import { buildPropertyRecordHref } from "@/hooks/navigation/routes"
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
} from "@/modules/template-sync/data/template-detail-request"

const TEMPLATE_SYNC_RETURN_TO = "/dashboard/template-sync"

/**
 * Cascade preset threaded in from the page's search params (deep links + the
 * hub view's template-row hand-off). Re-uses the engine's selection shape.
 */
export type TemplateSyncInitialSelections = CascadePickerInitialSelections

function managementCompanyToOption(option: ManagementCompanyOption): HubSidePanelPickerOption {
  return { id: option.id, title: option.name }
}

function propertyToOption(option: PropertyOption): HubSidePanelPickerOption {
  return { id: option.id, title: option.name, subtitle: option.address || null }
}

function templateToOption(option: TemplateOption): HubSidePanelPickerOption {
  return {
    id: option.id,
    title: option.unitType || "—",
    subtitles: [option.jobTypeName, option.description].filter(
      (value): value is string => Boolean(value && value.trim().length > 0),
    ),
    meta: formatTemplateItemsCount(option.itemsCount),
  }
}

export type TemplateSyncController = {
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
  openTemplate: (templateId: string) => void
}

/**
 * Page controller for the combined template-sync page. Composes the shared
 * cascade picker (Management Company → Property → Template), wires each step's
 * data request, loads the full editable template record when one is selected,
 * and owns the page-level actions (clear, new template, open-linked records).
 */
export function useTemplateSyncController(
  options: { initialSelections?: TemplateSyncInitialSelections; initialTemplate?: TemplateDetail | null } = {},
): TemplateSyncController {
  const { initialSelections, initialTemplate } = options
  const router = useRouter()
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

  const clear = useCallback(() => {
    cascade.reset()
  }, [cascade])

  const newTemplate = useCallback(() => {
    const params = new URLSearchParams()
    if (propertyId) params.set("propertyId", propertyId)
    if (managementCompanyId) params.set("managementCompanyId", managementCompanyId)
    params.set("returnTo", TEMPLATE_SYNC_RETURN_TO)
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
      router.push(buildPropertyRecordHref(id, mcId, TEMPLATE_SYNC_RETURN_TO))
    },
    [router],
  )

  const openTemplate = useCallback(
    (id: string) => {
      router.push(`/dashboard/templates/${id}`)
    },
    [router],
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
    openTemplate,
  }
}
