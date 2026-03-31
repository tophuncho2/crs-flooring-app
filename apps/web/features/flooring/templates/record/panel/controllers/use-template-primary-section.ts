"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { useRecordScopedSectionController } from "@/features/shared/engines/record-view"
import {
  areTemplateDraftsEqual,
  cloneDraftTemplate,
  toTemplateDraft,
} from "../shared"
import type { DraftTemplate, TemplateDetail } from "@/features/flooring/templates/types"

export function useTemplatePrimarySection(input: {
  currentUserId: string
  templateId: string
  template: TemplateDetail
  publishTemplate: (template: TemplateDetail) => void
  onTemplateSaved?: (template: TemplateDetail, previousPropertyId: string, itemsCount: number) => void
  applyConflictTemplateSnapshot: (error: unknown) => TemplateDetail | null
}) {
  const {
    currentUserId,
    templateId,
    template,
    publishTemplate,
    onTemplateSaved,
    applyConflictTemplateSnapshot,
  } = input

  return useRecordScopedSectionController<TemplateDetail, DraftTemplate>({
    currentUserId,
    recordId: templateId,
    sectionKey: "primary",
    serverValue: template,
    serverRevisionKey: template.updatedAt,
    createLocalValue: toTemplateDraft,
    cloneLocalValue: cloneDraftTemplate,
    isEqual: areTemplateDraftsEqual,
    onSave: async (nextDraft, serverTemplate, serverRevisionKey) => {
      try {
        const payload = await requestJson<{ template: TemplateDetail }>(
          `/api/flooring/templates/${serverTemplate.id}/primary/section`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              withMutationMeta(
                {
                  ...nextDraft,
                  warehouseId: nextDraft.warehouseId || null,
                  padProductId: nextDraft.padProductId || null,
                },
                serverRevisionKey,
              ),
            ),
          },
        )
        publishTemplate(payload.template)
        onTemplateSaved?.(payload.template, serverTemplate.propertyId, payload.template.summary.totalItemsCount)
        return {
          serverValue: payload.template,
          serverRevisionKey: payload.template.updatedAt,
          noticeMessage: "Template fields saved",
        }
      } catch (saveError) {
        applyConflictTemplateSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save template fields")
      }
    },
  })
}
