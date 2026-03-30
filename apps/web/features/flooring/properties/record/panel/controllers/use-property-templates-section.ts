"use client"

import { createLocalRecordRowId, createRecordSectionError, useRecordSectionController } from "@/features/shared/engines/record-view"
import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  createPropertyTemplatesRevisionKey,
  type PropertyDetailRecord,
  type PropertyTemplateDraft,
  type PropertyTemplateRow,
} from "../../../domain/types"

function createEmptyTemplateDraft(): PropertyTemplateDraft {
  return {
    id: createLocalRecordRowId("property-template"),
    templateTag: "",
    warehouseId: "",
  }
}

function toPropertyTemplateRow(template: {
  id: string
  templateTag: string
  warehouseName?: string
  itemsCount?: number
}): PropertyTemplateRow {
  return {
    id: template.id,
    templateTag: template.templateTag,
    warehouseName: template.warehouseName ?? "",
    itemsCount: template.itemsCount ?? 0,
  }
}

export function usePropertyTemplatesSection({
  record,
  publishRecord,
}: {
  record: PropertyDetailRecord
  publishRecord: (record: PropertyDetailRecord) => void
}) {
  const section = useRecordSectionController<PropertyDetailRecord, PropertyTemplateDraft | null>({
    serverValue: record,
    serverRevisionKey: createPropertyTemplatesRevisionKey(record),
    createLocalValue: () => null,
    onSave: async (draft, currentRecord) => {
      if (!draft) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Add a template row before saving.",
          retryable: true,
        })
      }

      if (!draft.templateTag.trim()) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Template tag is required.",
          retryable: true,
        })
      }

      const payload = await requestJson<{
        template: {
          id: string
          templateTag: string
          warehouseName?: string
          itemsCount?: number
        }
      }>("/api/flooring/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: currentRecord.id,
          templateTag: draft.templateTag,
          warehouseId: draft.warehouseId || null,
          items: [],
          serviceItems: [],
        }),
      })

      const nextRecord: PropertyDetailRecord = {
        ...currentRecord,
        templates: [toPropertyTemplateRow(payload.template), ...currentRecord.templates],
      }

      publishRecord(nextRecord)

      return {
        serverValue: nextRecord,
        serverRevisionKey: createPropertyTemplatesRevisionKey(nextRecord),
        noticeMessage: "Template created. Open the row to continue editing.",
      }
    },
  })

  function addDraft() {
    if (section.localValue) {
      return
    }

    section.setLocalValue(createEmptyTemplateDraft())
    section.setError(null)
  }

  function setDraftField(field: keyof Omit<PropertyTemplateDraft, "id">, value: string) {
    section.setLocalValue((previous) =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous,
    )

    if (section.error) {
      section.setError(null)
    }
  }

  return {
    ...section,
    addDraft,
    setDraftField,
    canAddDraft: !section.localValue && !section.isSaving,
  }
}
