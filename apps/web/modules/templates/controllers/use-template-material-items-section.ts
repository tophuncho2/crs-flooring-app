"use client"

import {
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import type {
  TemplateDetail,
  TemplateMaterialItemForm,
  TemplateMaterialItemRow,
  TemplateMaterialItemsDiff,
} from "@builders/domain"
import { validateTemplateMaterialItemForm } from "@builders/domain"
import { saveTemplateMaterialItemsSectionRequest } from "@/modules/templates/data/mutations"

export type TemplateMaterialItemLocal = {
  id: string
  productId: string
  quantity: string
  unitPrice: string
  notes: string
}

type TemplateMaterialItemsLocalState = {
  items: TemplateMaterialItemLocal[]
}

function toLocalItem(row: TemplateMaterialItemRow): TemplateMaterialItemLocal {
  return {
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    notes: row.notes,
  }
}

function createLocalState(record: TemplateDetail): TemplateMaterialItemsLocalState {
  return { items: record.items.map(toLocalItem) }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify(
    record.items.map((row) => `${row.id}:${row.productId}:${row.quantity}:${row.unitPrice}:${row.notes}`),
  )
}

function serverItemById(record: TemplateDetail) {
  const map = new Map<string, TemplateMaterialItemRow>()
  for (const row of record.items) {
    map.set(row.id, row)
  }
  return map
}

function itemsDiffer(local: TemplateMaterialItemLocal, server: TemplateMaterialItemRow) {
  return (
    local.productId !== server.productId ||
    local.quantity !== server.quantity ||
    local.unitPrice !== server.unitPrice ||
    local.notes !== server.notes
  )
}

function toDiffForm(local: TemplateMaterialItemLocal): TemplateMaterialItemForm {
  return {
    productId: local.productId,
    quantity: local.quantity,
    unitPrice: local.unitPrice,
    notes: local.notes,
  }
}

function buildDiff(
  local: TemplateMaterialItemsLocalState,
  server: TemplateDetail,
): TemplateMaterialItemsDiff {
  const serverById = serverItemById(server)
  const localIds = new Set(local.items.map((item) => item.id))

  const added = local.items
    .filter((item) => isLocalOnlyRecordRow(item.id))
    .map((item) => ({ tempId: item.id, form: toDiffForm(item) }))

  const modified: TemplateMaterialItemsDiff["modified"] = []
  for (const item of local.items) {
    if (isLocalOnlyRecordRow(item.id)) continue
    const serverRow = serverById.get(item.id)
    if (!serverRow) continue
    if (itemsDiffer(item, serverRow)) {
      modified.push({ id: item.id, form: toDiffForm(item) })
    }
  }

  const deleted = server.items
    .filter((row) => !localIds.has(row.id))
    .map((row) => ({ id: row.id }))

  return { added, modified, deleted }
}

export function useTemplateMaterialItemsSection({
  template,
  publishTemplate,
}: {
  template: TemplateDetail
  publishTemplate: (record: TemplateDetail) => void
}) {
  const section = useRecordScopedSectionController<TemplateDetail, TemplateMaterialItemsLocalState>({
    recordId: template.id,
    sectionKey: "material-items",
    serverValue: template,
    serverRevisionKey: createItemsRevisionKey(template),
    createLocalValue: createLocalState,
    persistDraft: false,
    policy: {
      addRowPlacement: "bottom",
      childRows: "inline",
    },
    onSave: async (localValue, currentRecord) => {
      for (const item of localValue.items) {
        const validationError = validateTemplateMaterialItemForm(toDiffForm(item))
        if (validationError) {
          throw createRecordSectionError({
            kind: "validation",
            message: validationError,
            retryable: true,
          })
        }
      }

      const diff = buildDiff(localValue, currentRecord)
      const { template: nextTemplate } = await saveTemplateMaterialItemsSectionRequest(
        currentRecord.id,
        diff,
        currentRecord.updatedAt,
      )

      publishTemplate(nextTemplate)

      return {
        serverValue: nextTemplate,
        serverRevisionKey: createItemsRevisionKey(nextTemplate),
        noticeMessage: "Material items saved",
      }
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        ...previous.items,
        {
          id: createLocalRecordRowId("template-material-item"),
          productId: "",
          quantity: "",
          unitPrice: "",
          notes: "",
        },
      ],
    }))
    section.setError(null)
  }

  function removeItem(itemId: string) {
    section.setLocalValue((previous) => ({
      items: previous.items.filter((row) => row.id !== itemId),
    }))
    section.setError(null)
  }

  function changeField(
    itemId: string,
    field: keyof TemplateMaterialItemLocal,
    value: string,
  ) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, [field]: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  return {
    ...section,
    items: section.localValue.items,
    addItem,
    removeItem,
    changeField,
  }
}
