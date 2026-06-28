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
  EMPTY_ENTITY_FORM,
  EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  validateCreatePropertyHubForm,
  type CreatePropertyHubForm,
  type EntityForm,
  type PropertyHubPropertyFields,
} from "@builders/domain"
import { createPropertyHubRequest } from "@/modules/entities/data/properties/property-mutations"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { ENTITIES_LIST_QUERY_KEY } from "@/modules/entities/data/list-entities-request"
import { ENTITY_OPTIONS_QUERY_KEY } from "@/modules/entities/data/entity-options-request"
import {
  buildPropertyRecordHref,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"

/**
 * The combined create-form state: an entity selection (link an existing entity OR
 * create a new one) plus the property fields. Mirrors the legacy hub create
 * slice, now driven by the record-view create controller.
 */
export type PropertyHubCreateForm = {
  entityLinkId: string | null
  entityLinkLabel: string | null
  entityForm: EntityForm
  propertyForm: PropertyHubPropertyFields
}

export type PropertyHubEntityMode = "none" | "link" | "create"

function entityFieldsHaveAnyValue(form: EntityForm): boolean {
  // `color` is an edit-only palette tag that always carries a non-empty default
  // (SLATE) — it is never user-entered intent, so it must NOT count toward
  // "the operator started creating an entity". Counting it would lock the form
  // into "create" mode and disable the link picker on a pristine form.
  return (Object.keys(form) as Array<keyof EntityForm>)
    .filter((key) => key !== "color")
    .some((key) => {
      const value = form[key]
      return Array.isArray(value) ? value.length > 0 : value.trim().length > 0
    })
}

/** Link wins; otherwise any typed entity field means "create"; otherwise none. */
export function deriveEntityMode(local: PropertyHubCreateForm): PropertyHubEntityMode {
  if (local.entityLinkId) return "link"
  if (entityFieldsHaveAnyValue(local.entityForm)) return "create"
  return "none"
}

export function buildHubCreatePayload(local: PropertyHubCreateForm): CreatePropertyHubForm {
  const entity: CreatePropertyHubForm["entity"] = local.entityLinkId
    ? { mode: "link", id: local.entityLinkId }
    : entityFieldsHaveAnyValue(local.entityForm)
      ? { mode: "create", fields: local.entityForm }
      : { mode: "none" }

  const property: CreatePropertyHubForm["property"] = local.propertyForm.name.trim()
    ? { mode: "create", fields: local.propertyForm }
    : { mode: "none" }

  return { entity, property }
}

/**
 * Create-mode controller for the unified property "hub" create page: creates a
 * property and (optionally) a entity — link an existing one, create
 * a new one, or neither — atomically via `/api/properties/hub`. On success it
 * lands on the created record (the property's entity view drilled in, or the entity view
 * when only a entity was created).
 */
export function usePropertyHubCreateSection({
  page,
  backHref,
  initialEntity,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  /** Pre-link an existing entity (e.g. "+ Property" from inside that entity's record view). */
  initialEntity?: { id: string; label: string | null } | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // When the form creates BOTH an entity and a property, we can't pick one
  // destination for the operator — surface a choice dialog instead of
  // auto-redirecting (see the `redirectTo: null` branch below).
  const [choice, setChoice] = useState<{
    propertyHref: string
    entityHref: string
  } | null>(null)

  const controller = useSingleSectionCreateController<PropertyHubCreateForm>({
    page,
    createInitialValue: () => ({
      entityLinkId: initialEntity?.id ?? null,
      entityLinkLabel: initialEntity?.label ?? null,
      entityForm: EMPTY_ENTITY_FORM,
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

      const { property, entity } = await createPropertyHubRequest(payload)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PROPERTIES_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ENTITIES_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ENTITY_OPTIONS_QUERY_KEY }),
      ])

      // Both created → let the operator choose where to land. Defer navigation
      // by returning `redirectTo: null` and opening the choice dialog.
      if (property && entity) {
        setChoice({
          propertyHref: buildPropertyRecordHref(property.id, entity.id, backHref),
          entityHref: buildRecordDetailHref(
            "/dashboard/entities",
            entity.id,
            backHref,
          ),
        })
        return { redirectTo: null, noticeMessage: "Created" }
      }

      const redirectTo = property
        ? buildPropertyRecordHref(property.id, entity?.id ?? null, backHref)
        : entity
          ? buildRecordDetailHref(
              "/dashboard/entities",
              entity.id,
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
        goToEntity: () =>
          router.push(choice.entityHref, { scroll: false }),
      }
    : null

  return { ...controller, choiceDialog }
}
