"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  EMPTY_MANAGEMENT_COMPANY_FORM,
  EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  validateCreatePropertyHubForm,
  type CreatePropertyHubForm,
  type ManagementCompanyForm,
  type PropertyHubPropertyFields,
} from "@builders/domain"
import { createPropertyHubRequest } from "@/modules/management-companies/data/properties/property-mutations"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import { MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY } from "@/modules/management-companies/data/management-company-options-request"
import {
  buildPropertyRecordHref,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"

/**
 * The combined create-form state: an MC selection (link an existing company OR
 * create a new one) plus the property fields. Mirrors the legacy hub create
 * slice, now driven by the record-view create controller.
 */
export type PropertyHubCreateForm = {
  mcLinkId: string | null
  mcLinkLabel: string | null
  mcForm: ManagementCompanyForm
  propertyForm: PropertyHubPropertyFields
}

export type PropertyHubMcMode = "none" | "link" | "create"

function mcFieldsHaveAnyValue(form: ManagementCompanyForm): boolean {
  return Object.values(form).some((value) => value.trim().length > 0)
}

/** Link wins; otherwise any typed MC field means "create"; otherwise none. */
export function deriveMcMode(local: PropertyHubCreateForm): PropertyHubMcMode {
  if (local.mcLinkId) return "link"
  if (mcFieldsHaveAnyValue(local.mcForm)) return "create"
  return "none"
}

function buildHubCreatePayload(local: PropertyHubCreateForm): CreatePropertyHubForm {
  const managementCompany: CreatePropertyHubForm["managementCompany"] = local.mcLinkId
    ? { mode: "link", id: local.mcLinkId }
    : mcFieldsHaveAnyValue(local.mcForm)
      ? { mode: "create", fields: local.mcForm }
      : { mode: "none" }

  const property: CreatePropertyHubForm["property"] = local.propertyForm.name.trim()
    ? { mode: "create", fields: local.propertyForm }
    : { mode: "none" }

  return { managementCompany, property }
}

/**
 * Create-mode controller for the unified property "hub" create page: creates a
 * property and (optionally) a management company — link an existing one, create
 * a new one, or neither — atomically via `/api/properties/hub`. On success it
 * lands on the created record (the property's MC view drilled in, or the MC view
 * when only a company was created).
 */
export function usePropertyHubCreateSection({
  page,
  backHref,
  initialManagementCompany,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  /** Pre-link an existing MC (e.g. "+ Property" from inside that MC's record view). */
  initialManagementCompany?: { id: string; label: string | null } | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // When the form creates BOTH an MC and a property, we can't pick one
  // destination for the operator — surface a choice dialog instead of
  // auto-redirecting (see the `redirectTo: null` branch below).
  const [choice, setChoice] = useState<{
    propertyHref: string
    managementCompanyHref: string
  } | null>(null)

  const controller = useSingleSectionCreateController<PropertyHubCreateForm>({
    page,
    createInitialValue: () => ({
      mcLinkId: initialManagementCompany?.id ?? null,
      mcLinkLabel: initialManagementCompany?.label ?? null,
      mcForm: EMPTY_MANAGEMENT_COMPANY_FORM,
      propertyForm: EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
    }),
    createRecord: async (local) => {
      const payload = buildHubCreatePayload(local)

      const validationError = validateCreatePropertyHubForm(payload)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const { property, managementCompany } = await createPropertyHubRequest(payload)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PROPERTIES_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MANAGEMENT_COMPANIES_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY }),
      ])

      // Both created → let the operator choose where to land. Defer navigation
      // by returning `redirectTo: null` and opening the choice dialog.
      if (property && managementCompany) {
        setChoice({
          propertyHref: buildPropertyRecordHref(property.id, managementCompany.id, backHref),
          managementCompanyHref: buildRecordDetailHref(
            "/dashboard/management-companies",
            managementCompany.id,
            backHref,
          ),
        })
        return { redirectTo: null, noticeMessage: "Created" }
      }

      const redirectTo = property
        ? buildPropertyRecordHref(property.id, managementCompany?.id ?? null, backHref)
        : managementCompany
          ? buildRecordDetailHref(
              "/dashboard/management-companies",
              managementCompany.id,
              backHref,
            )
          : backHref

      return { redirectTo, noticeMessage: "Created" }
    },
  })

  const choiceDialog = choice
    ? {
        open: true,
        goToProperty: () => router.push(choice.propertyHref, { scroll: false }),
        goToManagementCompany: () =>
          router.push(choice.managementCompanyHref, { scroll: false }),
      }
    : null

  return { ...controller, choiceDialog }
}
