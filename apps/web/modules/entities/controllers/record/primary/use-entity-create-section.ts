"use client"

import {
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  EMPTY_ENTITY_FORM,
  validateEntityForm,
  type EntityForm,
} from "@builders/domain"
import { createPropertyHubRequest } from "@/modules/entities/data/properties/property-mutations"
import { buildRecordDetailHref } from "@/hooks/navigation/routes"

/**
 * Create-mode controller for the entity record view's primary section. Saving
 * creates the entity **and** links the property it was opened for —
 * atomically, via `/api/properties/hub` (`entity: create` +
 * `property: link`). On success it redirects to the new entity's edit view drilled
 * into that property.
 */
export function useEntityCreateSection({
  page,
  propertyId,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  propertyId: string
  backHref: string
}) {
  return useSingleSectionCreateController<EntityForm>({
    page,
    // Rendered through RecordMultiSectionPanel, which is the sole dirty-sections
    // writer; let it own that so the controller doesn't double-write and fight
    // the panel (which loops). Mirrors useEntityPrimarySection (edit).
    manageDirtySections: false,
    createInitialValue: () => EMPTY_ENTITY_FORM,
    createRecord: async (localValue) => {
      const validationError = validateEntityForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const { entity } = await createPropertyHubRequest({
        entity: { mode: "create", fields: localValue },
        property: { mode: "link", id: propertyId },
      })

      if (!entity) {
        throw createRecordSectionError({
          kind: "transport",
          message: "Entity was not created",
          retryable: true,
        })
      }

      const detailHref = buildRecordDetailHref(
        "/dashboard/entities",
        entity.id,
        backHref,
      )
      const separator = detailHref.includes("?") ? "&" : "?"

      return {
        redirectTo: `${detailHref}${separator}property=${propertyId}`,
        noticeMessage: "Entity created",
      }
    },
  })
}
