"use client"

import {
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  EMPTY_MANAGEMENT_COMPANY_FORM,
  validateManagementCompanyForm,
  type ManagementCompanyForm,
} from "@builders/domain"
import { createPropertyHubRequest } from "@/modules/properties/data/mutations"
import { buildRecordDetailHref } from "@/hooks/navigation/routes"

/**
 * Create-mode controller for the MC record view's primary section. Saving
 * creates the management company **and** links the property it was opened for —
 * atomically, via `/api/properties/hub` (`managementCompany: create` +
 * `property: link`). On success it redirects to the new MC's edit view drilled
 * into that property.
 */
export function useMcCreateSection({
  page,
  propertyId,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  propertyId: string
  backHref: string
}) {
  return useSingleSectionCreateController<ManagementCompanyForm>({
    page,
    // Rendered through RecordMultiSectionPanel, which is the sole dirty-sections
    // writer; let it own that so the controller doesn't double-write and fight
    // the panel (which loops). Mirrors useMcPrimarySection (edit).
    manageDirtySections: false,
    createInitialValue: () => EMPTY_MANAGEMENT_COMPANY_FORM,
    createRecord: async (localValue) => {
      const validationError = validateManagementCompanyForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const { managementCompany } = await createPropertyHubRequest({
        managementCompany: { mode: "create", fields: localValue },
        property: { mode: "link", id: propertyId },
      })

      if (!managementCompany) {
        throw createRecordSectionError({
          kind: "transport",
          message: "Management company was not created",
          retryable: true,
        })
      }

      const detailHref = buildRecordDetailHref(
        "/dashboard/management-companies",
        managementCompany.id,
        backHref,
      )
      const separator = detailHref.includes("?") ? "&" : "?"

      return {
        redirectTo: `${detailHref}${separator}property=${propertyId}`,
        noticeMessage: "Management company created",
      }
    },
  })
}
