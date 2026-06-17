"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  EMPTY_TEMPLATE_FORM,
  validateTemplateForm,
  type TemplateDetail,
  type TemplateForm,
} from "@builders/domain"
import { createTemplateRequest } from "@/modules/templates/data/mutations"
import { TEMPLATE_OPTIONS_QUERY_KEY } from "@/modules/templates/data/template-options-request"
import { TEMPLATES_LIST_QUERY_KEY } from "@/modules/templates/data/list-templates-request"

export type TemplateQuickCreateResult = {
  template: TemplateDetail
}

/**
 * The modal-mounted quick-create controller for templates — the lean sibling of
 * the full create page (`TemplateCreateClient`). Drives a trimmed `TemplateForm`
 * inside a record view and, unlike the page, does **not** navigate on success: it
 * returns the created template so the host can fill the originating cell. Posts
 * the same `/api/templates` create shape as the page (`createTemplateRequest`),
 * so server validation stays identical.
 */
export function useTemplateQuickCreate({
  initialPropertyId,
}: {
  /** Scope the new template to the host's current property (optional). */
  initialPropertyId?: string | null
} = {}) {
  const queryClient = useQueryClient()

  const [localValue, setLocalValue] = useState<TemplateForm>(() => ({
    ...EMPTY_TEMPLATE_FORM,
    propertyId: initialPropertyId ?? EMPTY_TEMPLATE_FORM.propertyId,
  }))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreate = localValue.unitType.trim().length > 0

  async function save(): Promise<TemplateQuickCreateResult | null> {
    const validationError = validateTemplateForm(localValue)
    if (validationError) {
      setError(validationError)
      return null
    }

    setIsSaving(true)
    setError(null)
    try {
      const result = await createTemplateRequest(localValue)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: TEMPLATE_OPTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TEMPLATES_LIST_QUERY_KEY }),
      ])

      return result
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create template")
      return null
    } finally {
      setIsSaving(false)
    }
  }

  return { localValue, setLocalValue, isSaving, error, canCreate, save }
}
