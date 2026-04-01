"use client"

import { useCallback, useEffect, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import {
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordItemController,
  useRecordScopedSectionController,
} from "@/features/shared/engines/record-view"
import {
  clearRowFieldError,
  type RowFieldErrors,
} from "@/features/flooring/shared/ui/record-items/record-field-errors"
import {
  type EditableMaterialItem,
  type MaterialItemField,
  validateMaterialItemFields,
} from "@/features/flooring/shared/ui/record-items/material-items-editor"
import {
  areMaterialItemsEqual,
  cloneMaterialItems,
  createEmptyMaterialItem,
} from "../shared"
import type { TemplateDetail } from "@/features/flooring/templates/types"

export function useTemplateMaterialSection(input: {
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
  const [itemErrors, setItemErrors] = useState<RowFieldErrors<MaterialItemField>>({})

  const controller = useRecordScopedSectionController<EditableMaterialItem[], EditableMaterialItem[]>({
    currentUserId,
    recordId: templateId,
    sectionKey: "material",
    serverValue: template.items,
    serverRevisionKey: template.updatedAt,
    createLocalValue: cloneMaterialItems,
    cloneLocalValue: cloneMaterialItems,
    isEqual: areMaterialItemsEqual,
    onSave: async (items, serverItems, serverRevisionKey) => {
      void serverItems
      const nextErrors: RowFieldErrors<MaterialItemField> = {}

      for (const item of items) {
        const rowErrors = validateMaterialItemFields({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
        if (Object.keys(rowErrors).length > 0) {
          nextErrors[item.id] = rowErrors
        }
      }

      setItemErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Fix the highlighted material item fields before saving.",
        })
      }

      try {
        const payload = await requestJson<{ template: TemplateDetail }>(
          `/api/flooring/templates/${template.id}/items/section`,
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
                      productId: item.productId,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      notes: item.notes || null,
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
          serverValue: payload.template.items,
          serverRevisionKey: payload.template.updatedAt,
          noticeMessage: "Material section saved",
        }
      } catch (saveError) {
        applyConflictTemplateSnapshot(saveError)
        throw saveError instanceof Error ? saveError : new Error("Failed to save material section")
      }
    },
  })

  const itemController = useRecordItemController<EditableMaterialItem>({
    setItems: controller.setLocalValue,
    getItemId: (item) => item.id,
  })

  const addItem = useCallback(() => {
    itemController.addItem(createEmptyMaterialItem)
  }, [itemController])

  const changeField = useCallback(
    (itemId: string, field: keyof EditableMaterialItem, value: string) => {
      itemController.updateItem(itemId, (item) => ({ ...item, [field]: value }))

      if (field === "productId" || field === "quantity" || field === "unitPrice") {
        setItemErrors((previous) => clearRowFieldError(previous, itemId, field))
      }
    },
    [itemController],
  )

  const deleteItem = useCallback(
    (itemId: string) => {
      if (!confirmDelete("material item")) {
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
