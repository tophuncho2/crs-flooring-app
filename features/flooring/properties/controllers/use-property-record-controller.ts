"use client"

import { useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { useRecordDetailController } from "@/features/flooring/shared/controllers/record-page/use-record-detail-controller"
import type { RecordNotices } from "@/features/flooring/shared/controllers/record-page/use-record-notices"
import { normalizeAddressState } from "@/features/flooring/shared/domain/address-helpers"

export type PropertyManagementCompany = {
  id: string
  name: string
}

export type PropertyTemplateRow = {
  id: string
  templateTag: string
  warehouseName: string
  itemsCount: number
}

export type PropertyDetailRecord = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  managementCompany: PropertyManagementCompany | null
  templates: PropertyTemplateRow[]
  updatedAt: string
}

export type PropertyDraft = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  managementCompanyId: string
}

export type PropertyTemplateDraft = {
  templateTag: string
  propertyId: string
  warehouseId: string
  instructions: string
  templateNotes: string
  padProductId: string
}

const defaultTemplateDraft: PropertyTemplateDraft = {
  templateTag: "",
  propertyId: "",
  warehouseId: "",
  instructions: "",
  templateNotes: "",
  padProductId: "",
}

function createPropertyDraft(property: PropertyDetailRecord): PropertyDraft {
  return {
    name: property.name,
    streetAddress: property.streetAddress,
    city: property.city,
    state: property.state,
    zip: property.zip,
    phone: property.phone,
    email: property.email,
    managementCompanyId: property.managementCompany?.id ?? "",
  }
}

export function usePropertyRecordController({
  initialProperty,
  notices,
  onDeleted,
}: {
  initialProperty: PropertyDetailRecord
  notices: RecordNotices
  onDeleted: () => void
}) {
  const {
    record,
    draft,
    setDraft,
    loading,
    error,
    syncRecord,
    clearRecordCache,
    isDirty,
  } = useRecordDetailController<PropertyDetailRecord, PropertyDraft>({
    scope: "property",
    id: initialProperty.id,
    initialRecord: initialProperty,
    toDraft: createPropertyDraft,
    url: `/api/flooring/properties/${initialProperty.id}`,
    payloadKey: "property",
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isTemplateCreateOpen, setIsTemplateCreateOpen] = useState(false)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [templateDraft, setTemplateDraft] = useState<PropertyTemplateDraft>({
    ...defaultTemplateDraft,
    propertyId: initialProperty.id,
  })

  const currentProperty = record ?? initialProperty
  const currentDraft = draft ?? createPropertyDraft(currentProperty)

  function setDraftField(field: keyof PropertyDraft, value: string) {
    const normalizedValue = field === "state" ? normalizeAddressState(value) : value
    setDraft((previous) => ({ ...(previous ?? currentDraft), [field]: normalizedValue }))
  }

  function setTemplateDraftField(field: keyof PropertyTemplateDraft, value: string) {
    setTemplateDraft((previous) => ({ ...previous, [field]: value }))
  }

  function toggleCreateTemplate() {
    notices.clearNotices()
    setTemplateDraft({ ...defaultTemplateDraft, propertyId: currentProperty.id })
    setIsTemplateCreateOpen((previous) => !previous)
  }

  function cancelCreateTemplate() {
    setIsTemplateCreateOpen(false)
  }

  async function saveProperty() {
    notices.clearNotices()
    setIsSaving(true)

    try {
      if (!currentDraft.name.trim()) {
        throw new Error("Property name is required")
      }

      const payload = await requestJson<{ property?: PropertyDetailRecord }>(`/api/flooring/properties/${currentProperty.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentDraft.name,
          streetAddress: currentDraft.streetAddress,
          city: currentDraft.city,
          state: currentDraft.state,
          zip: currentDraft.zip,
          phone: currentDraft.phone,
          email: currentDraft.email,
          managementCompanyId: currentDraft.managementCompanyId || null,
        }),
      })

      if (!payload.property) {
        throw new Error("Failed to save property")
      }

      syncRecord(payload.property)
      notices.showSuccess("Property saved")
    } catch (saveError) {
      notices.showError(saveError instanceof Error ? saveError.message : "Failed to save property")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteProperty() {
    notices.clearNotices()
    setIsSaving(true)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/properties/${currentProperty.id}`, { method: "DELETE" })
      clearRecordCache()
      onDeleted()
    } catch (deleteError) {
      notices.showError(deleteError instanceof Error ? deleteError.message : "Failed to delete property")
      setIsSaving(false)
    }
  }

  async function createTemplate() {
    notices.clearNotices()
    setIsCreatingTemplate(true)

    try {
      if (!templateDraft.templateTag.trim()) {
        throw new Error("Template tag is required")
      }

      const payload = await requestJson<{
        template?: {
          id: string
          templateTag: string
          warehouseName: string
        }
      }>("/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...templateDraft,
          propertyId: currentProperty.id,
          warehouseId: templateDraft.warehouseId || null,
          padProductId: templateDraft.padProductId || null,
        }),
      })

      if (!payload.template) {
        throw new Error("Failed to create template")
      }

      syncRecord(
        {
          ...currentProperty,
          templates: [
            {
              id: payload.template.id,
              templateTag: payload.template.templateTag,
              warehouseName: payload.template.warehouseName,
              itemsCount: 0,
            },
            ...currentProperty.templates,
          ],
        },
        { syncDraft: false },
      )

      setIsTemplateCreateOpen(false)
      setTemplateDraft({ ...defaultTemplateDraft, propertyId: currentProperty.id })
      return payload.template.id
    } catch (createError) {
      notices.showError(createError instanceof Error ? createError.message : "Failed to create template")
      return null
    } finally {
      setIsCreatingTemplate(false)
    }
  }

  return {
    property: currentProperty,
    draft: currentDraft,
    loading,
    error,
    isDirty,
    isSaving,
    isTemplateCreateOpen,
    templateDraft,
    isCreatingTemplate,
    setDraftField,
    setTemplateDraftField,
    toggleCreateTemplate,
    cancelCreateTemplate,
    saveProperty,
    deleteProperty,
    createTemplate,
  }
}
