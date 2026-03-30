"use client"

import { useCallback, useEffect, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import {
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordItemController,
} from "@/features/shared/engines/record-view"
import {
  clearRowFieldError,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import {
  type EditableSalesRepItem,
  type SalesRepField,
  validateSalesRepFields,
} from "@/features/flooring/shared/line-items/sales-rep-items-editor"
import { useTemplateSectionController } from "./use-template-section-controller"
import {
  areSalesRepItemsEqual,
  cloneSalesRepItems,
  createEmptySalesRepItem,
} from "../shared"
import type { TemplateDetail } from "@/features/flooring/templates/types"

export function useTemplateSalesRepsSection(input: {
  currentUserId: string
  templateId: string
  template: TemplateDetail
  publishTemplate: (template: TemplateDetail) => void
  onTemplateSaved?: (template: TemplateDetail, previousPropertyId: string, itemsCount: number) => void
  applyConflictTemplateSnapshot: (error: unknown) => TemplateDetail | null
  confirmDelete: (label: string) => boolean
}) {
  const {
    currentUserId,
    templateId,
    template,
    publishTemplate,
    onTemplateSaved,
    applyConflictTemplateSnapshot,
    confirmDelete,
  } = input
  const [itemErrors, setItemErrors] = useState<RowFieldErrors<SalesRepField>>({})

  const controller = useTemplateSectionController<TemplateDetail["salesReps"], TemplateDetail["salesReps"]>({
    currentUserId,
    templateId,
    section: "sales",
    serverValue: template.salesReps,
    serverRevisionKey: template.updatedAt,
    createLocalValue: cloneSalesRepItems,
    cloneLocalValue: cloneSalesRepItems,
    isEqual: areSalesRepItemsEqual,
    onSave: async (items, serverItems, serverRevisionKey) => {
      void serverItems
      const nextErrors: RowFieldErrors<SalesRepField> = {}

      for (const item of items) {
        const rowErrors = validateSalesRepFields({
          contactId: item.contactId,
          percent: item.percent,
        })
        if (Object.keys(rowErrors).length > 0) {
          nextErrors[item.id] = rowErrors
        }
      }

      setItemErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Fix the highlighted sales rep fields before saving.",
        })
      }

      try {
        const payload = await requestJson<{ template: TemplateDetail }>(
          `/api/flooring/templates/${template.id}/sales-reps/section`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              withMutationMeta(
                {
                  items: items.map((item) => ({
                    id: isLocalOnlyRecordRow(item.id) ? null : item.id,
                    expectedUpdatedAt: isLocalOnlyRecordRow(item.id) ? null : item.updatedAt,
                    item: {
                      contactId: item.contactId,
                      percent: item.percent,
                    },
                  })),
                },
                serverRevisionKey,
              ),
            ),
          },
        )
        setItemErrors({})
        publishTemplate(payload.template)
        onTemplateSaved?.(payload.template, payload.template.propertyId, payload.template.summary.totalItemsCount)
        return {
          serverValue: payload.template.salesReps,
          serverRevisionKey: payload.template.updatedAt,
          noticeMessage: "Sales rep section saved",
        }
      } catch (saveError) {
        applyConflictTemplateSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save sales rep section")
      }
    },
  })

  const itemController = useRecordItemController<EditableSalesRepItem>({
    setItems: controller.setLocalValue,
    getItemId: (item) => item.id,
  })

  const addItem = useCallback(() => {
    itemController.addItem(createEmptySalesRepItem)
  }, [itemController])

  const changeField = useCallback(
    (itemId: string, field: keyof EditableSalesRepItem, value: string) => {
      itemController.updateItem(itemId, (item) => ({ ...item, [field]: value }))

      if (field === "contactId" || field === "percent") {
        setItemErrors((previous) => clearRowFieldError(previous, itemId, field))
      }
    },
    [itemController],
  )

  const deleteItem = useCallback(
    (itemId: string) => {
      if (!confirmDelete("sales rep")) {
        return
      }

      itemController.removeItem(itemId)
      setItemErrors((previous) => {
        const next = { ...previous }
        delete next[itemId]
        return next
      })
    },
    [confirmDelete, itemController],
  )

  useEffect(() => {
    if (!controller.isDirty) {
      setItemErrors({})
    }
  }, [controller.isDirty])

  return {
    ...controller,
    itemErrors,
    addItem,
    changeField,
    deleteItem,
  }
}
