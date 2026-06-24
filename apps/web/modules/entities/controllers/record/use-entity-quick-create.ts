"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  EMPTY_ENTITY_FORM,
  validateEntityForm,
  type EntityDetail,
  type EntityForm,
} from "@builders/domain"
import { createEntityRequest } from "@/modules/entities/data/mutations"
import { ENTITIES_LIST_QUERY_KEY } from "@/modules/entities/data/list-entities-request"
import { ENTITY_OPTIONS_QUERY_KEY } from "@/modules/entities/data/entity-options-request"

export type EntityQuickCreateResult = {
  entity: EntityDetail | null
}

/**
 * The modal-mounted controller for the lean entity quick-create: drives a single
 * {@link EntityForm} (Entity Name + optional contact/address), creates
 * via `/api/entities`, and — unlike the full create page — does **not**
 * navigate. It returns the created `EntityDetail` so the host can fill
 * its originating cell, and invalidates the entity list + options queries so every
 * picker/list sees the new entity.
 */
export function useEntityQuickCreate() {
  const queryClient = useQueryClient()

  const [localValue, setLocalValue] = useState<EntityForm>(
    () => EMPTY_ENTITY_FORM,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreate = localValue.entity.trim().length > 0

  async function save(): Promise<EntityQuickCreateResult | null> {
    const validationError = validateEntityForm(localValue)
    if (validationError) {
      setError(validationError)
      return null
    }

    setIsSaving(true)
    setError(null)
    try {
      const result = await createEntityRequest(localValue)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ENTITIES_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ENTITY_OPTIONS_QUERY_KEY }),
      ])

      return result
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to create entity",
      )
      return null
    } finally {
      setIsSaving(false)
    }
  }

  return { localValue, setLocalValue, isSaving, error, canCreate, save }
}
