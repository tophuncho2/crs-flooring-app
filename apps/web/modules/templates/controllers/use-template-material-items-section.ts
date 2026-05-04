"use client"

import { useCallback, useState } from "react"
import {
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import { buildDuplicatedRow } from "@/components/features/duplicate-row"
import type {
  ProductPickerOption,
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
  productPickerOptionsByItemId,
  publishTemplate,
}: {
  template: TemplateDetail
  productPickerOptionsByItemId: Record<string, ProductPickerOption>
  publishTemplate: (record: TemplateDetail) => void
}) {
  // Session-scoped record of the picker option currently shown for each row,
  // seeded from the SSR-hydrated map. Updated whenever ProductPicker fires
  // onSelectOption. Used for: parent-category trigger label, quantity unit
  // suffix, and category derivation when categoryFilterId is null.
  const [selectedProductOptionByRowId, setSelectedProductOptionByRowId] = useState<
    Record<string, ProductPickerOption>
  >(() => ({ ...productPickerOptionsByItemId }))

  const setSelectedProductOption = useCallback(
    (rowId: string, option: ProductPickerOption | null) => {
      setSelectedProductOptionByRowId((previous) => {
        if (option === null) {
          if (!(rowId in previous)) return previous
          const next = { ...previous }
          delete next[rowId]
          return next
        }
        if (previous[rowId]?.id === option.id) return previous
        return { ...previous, [rowId]: option }
      })
    },
    [],
  )

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
      const { template: nextTemplate, tempIdMap } =
        await saveTemplateMaterialItemsSectionRequest(
          currentRecord.id,
          diff,
          currentRecord.updatedAt,
        )

      publishTemplate(nextTemplate)

      return {
        serverValue: nextTemplate,
        serverRevisionKey: createItemsRevisionKey(nextTemplate),
        noticeMessage: "Material items saved",
        tempIdMap,
      }
    },
    onReconcile: ({ tempIdMap }) => {
      // Migrate the session-scoped picker map from optimistic clientIds to
      // the server-stamped ids returned in the save response. Without this
      // the just-saved rows render as drafts (no selectedOption) until the
      // page is reloaded.
      setSelectedProductOptionByRowId((previous) => {
        let changed = false
        const next: Record<string, ProductPickerOption> = {}
        for (const [rowId, option] of Object.entries(previous)) {
          const mappedId = tempIdMap[rowId]
          if (mappedId && mappedId !== rowId) {
            next[mappedId] = option
            changed = true
          } else {
            next[rowId] = option
          }
        }
        return changed ? next : previous
      })
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
    setSelectedProductOptionByRowId((previous) => {
      if (!(itemId in previous)) return previous
      const next = { ...previous }
      delete next[itemId]
      return next
    })
    section.setError(null)
  }

  function duplicateItem(sourceItemId: string) {
    const newRowId = createLocalRecordRowId("template-material-item")
    section.setLocalValue((previous) => {
      const source = previous.items.find((row) => row.id === sourceItemId)
      if (!source) return previous
      const duplicated: TemplateMaterialItemLocal = {
        id: newRowId,
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
    setSelectedProductOptionByRowId((previous) => {
      const sourceOption = previous[sourceItemId]
      if (!sourceOption) return previous
      return { ...previous, [newRowId]: sourceOption }
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
  // the diff in `toDiffForm` / `itemsDiffer`). Changing category clears the
  // picked product because the async picker only fetches products in the
  // chosen category; the previously-picked product would no longer be
  // selectable from the dropdown.
  function changeCategoryFilter(itemId: string, categoryId: string | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) => {
        if (row.id !== itemId) return row
        if (row.categoryFilterId === categoryId) return row
        return { ...row, categoryFilterId: categoryId, productId: "" }
      }),
    }))
    setSelectedProductOptionByRowId((previous) => {
      if (!(itemId in previous)) return previous
      const next = { ...previous }
      delete next[itemId]
      return next
    })
  }

  return {
    ...section,
    items: section.localValue.items,
    selectedProductOptionByRowId,
    setSelectedProductOption,
    addItem,
    removeItem,
    duplicateItem,
    changeField,
    changeCategoryFilter,
  }
}
