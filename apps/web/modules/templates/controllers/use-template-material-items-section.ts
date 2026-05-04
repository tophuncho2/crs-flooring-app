"use client"

import {
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import { buildDuplicatedRow } from "@/components/features/duplicate-row"
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
  notes: string
  // Client-only ergonomic for narrowing the row's product picker. NOT
  // persisted to the server — excluded from the diff sent on save.
  categoryFilterId: string | null
}

type TemplateMaterialItemsLocalState = {
  items: TemplateMaterialItemLocal[]
}

function toLocalItem(row: TemplateMaterialItemRow): TemplateMaterialItemLocal {
  return {
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    notes: row.notes,
    categoryFilterId: null,
  }
}

function createLocalState(record: TemplateDetail): TemplateMaterialItemsLocalState {
  return { items: record.items.map(toLocalItem) }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify(
    record.items.map((row) => `${row.id}:${row.productId}:${row.quantity}:${row.notes}`),
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
    local.notes !== server.notes
  )
}

function toDiffForm(local: TemplateMaterialItemLocal): TemplateMaterialItemForm {
  return {
    productId: local.productId,
    quantity: local.quantity,
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
          notes: "",
          categoryFilterId: null,
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

  function duplicateItem(sourceItemId: string) {
    section.setLocalValue((previous) => {
      const source = previous.items.find((row) => row.id === sourceItemId)
      if (!source) return previous
      // Copy productId + categoryFilterId so the new row's product picker is
      // pre-filtered to the same category. Quantity + notes start blank so
      // the user has to confirm the per-row values for the new line.
      const duplicated: TemplateMaterialItemLocal = {
        id: createLocalRecordRowId("template-material-item"),
        ...buildDuplicatedRow(
          {
            productId: source.productId,
            quantity: source.quantity,
            notes: source.notes,
            categoryFilterId: source.categoryFilterId,
          },
          {
            copy: ["productId", "categoryFilterId"],
            defaults: {
              productId: "",
              quantity: "",
              notes: "",
              categoryFilterId: null,
            },
          },
        ),
      }
      return { items: [...previous.items, duplicated] }
    })
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

  // Client-only ergonomic — does NOT mark the section dirty (excluded from
  // the diff in `toDiffForm` / `itemsDiffer`). Mirrors imports staged-rows
  // `setRowCategoryFilter`. Intentionally does not clear `productId`; the
  // section's product picker preserves the current selection across filter
  // changes so the user's pick survives.
  function changeCategoryFilter(itemId: string, categoryId: string | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, categoryFilterId: categoryId } : row,
      ),
    }))
  }

  return {
    ...section,
    items: section.localValue.items,
    addItem,
    removeItem,
    duplicateItem,
    changeField,
    changeCategoryFilter,
  }
}
