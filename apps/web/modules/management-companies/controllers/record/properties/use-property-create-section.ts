"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  validatePropertyPrimaryForm,
  type PropertyPrimaryForm,
} from "@builders/domain"
import { createPropertyRequest } from "@/modules/management-companies/data/properties/property-mutations"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import { buildPropertyRecordHref } from "@/hooks/navigation/routes"

const EMPTY_PROPERTY_PRIMARY_FORM: PropertyPrimaryForm = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  instructions: "",
  managementCompanyId: "",
}

/**
 * Create-mode controller for the property record view's **embedded** create
 * form — opened from the MC record view's properties list ("+ Property"). Seeds
 * the management company prelinked (still editable) and creates a single
 * property via `/api/properties`. On success it drills into the new property in
 * edit mode by landing on the same MC page with `?property=<newId>`; the
 * embedded view's Back returns to the list.
 */
export function usePropertyCreateSection({
  page,
  managementCompanyId,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  managementCompanyId: string
  backHref: string
}) {
  const queryClient = useQueryClient()

  return useSingleSectionCreateController<PropertyPrimaryForm>({
    page,
    // The embedded view renders via RecordMultiSectionPanel, which owns
    // dirty-section tracking (and bridges it to the host via onDirtyChange) —
    // mirror the edit controller and let the panel manage it.
    manageDirtySections: false,
    createInitialValue: () => ({
      ...EMPTY_PROPERTY_PRIMARY_FORM,
      managementCompanyId,
    }),
    createRecord: async (local) => {
      const validationError = validatePropertyPrimaryForm(local)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const { property } = await createPropertyRequest(local)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PROPERTIES_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MANAGEMENT_COMPANIES_LIST_QUERY_KEY }),
      ])

      return {
        redirectTo: buildPropertyRecordHref(
          property.id,
          property.managementCompany?.id ?? managementCompanyId,
          backHref,
        ),
        noticeMessage: "Property created",
      }
    },
  })
}
