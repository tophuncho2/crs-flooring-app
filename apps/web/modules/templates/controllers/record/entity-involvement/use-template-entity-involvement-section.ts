"use client"

import {
  buildRowDiff,
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/engines/record-view"
import type {
  EntityOption,
  EntityTypeRef,
  TemplateDetail,
  TemplateEntityInvolvementForm,
  TemplateEntityInvolvementRow,
  TemplateEntityInvolvementsDiff,
} from "@builders/domain"
import { validateTemplateEntityInvolvementForm } from "@builders/domain"
import { saveTemplateEntityInvolvementsSectionRequest } from "@/modules/templates/data/mutations"

export type TemplateEntityInvolvementLocal = {
  id: string
  // Optional entity link (null = unlinked) — the only writable/diffed link field.
  entityId: string | null
  // Read-only hydration co-located with entityId so the picker's selectedLabel
  // and the Type chip can never desync from the id (grid label-contract fix).
  // Never sent on save; seeded from the row on load, snapshotted on pick.
  entityName: string | null
  entityType: EntityTypeRef | null
  // Free-text reason the entity is involved; "" = unset (persisted NULL).
  involvementType: string
}

type TemplateEntityInvolvementsLocalState = {
  items: TemplateEntityInvolvementLocal[]
}

function toLocalItem(row: TemplateEntityInvolvementRow): TemplateEntityInvolvementLocal {
  return {
    id: row.id,
    entityId: row.entityId,
    entityName: row.entityName,
    entityType: row.entityType,
    involvementType: row.involvementType,
  }
}

function createLocalState(record: TemplateDetail): TemplateEntityInvolvementsLocalState {
  return { items: record.entityInvolvements.map(toLocalItem) }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify(
    record.entityInvolvements.map((row) => `${row.id}:${row.entityId}:${row.involvementType}`),
  )
}

function itemsDiffer(local: TemplateEntityInvolvementLocal, server: TemplateEntityInvolvementRow) {
  return local.entityId !== server.entityId || local.involvementType !== server.involvementType
}

function toDiffForm(local: TemplateEntityInvolvementLocal): TemplateEntityInvolvementForm {
  return {
    // Only the writable link — the entityName/entityType fields are display
    // hydration and must never enter the diff form.
    entityId: local.entityId,
    involvementType: local.involvementType,
  }
}

function buildDiff(
  local: TemplateEntityInvolvementsLocalState,
  server: TemplateDetail,
): TemplateEntityInvolvementsDiff {
  // Add appends at the bottom (no reverseAdded), matching the section policy.
  return buildRowDiff({
    locals: local.items,
    serverRows: server.entityInvolvements,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: itemsDiffer,
    toAdded: (item) => ({ tempId: item.id, form: toDiffForm(item) }),
    toModified: (item) => ({ id: item.id, form: toDiffForm(item) }),
  })
}

export function useTemplateEntityInvolvementSection({
  template,
  publishTemplate,
}: {
  template: TemplateDetail
  publishTemplate: (record: TemplateDetail) => void
}) {
  const section = useRecordScopedSectionController<TemplateDetail, TemplateEntityInvolvementsLocalState>({
    recordId: template.id,
    sectionKey: "entity-involvement",
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
        const validationError = validateTemplateEntityInvolvementForm(toDiffForm(item))
        if (validationError) {
          throw createRecordSectionError({
            kind: "validation",
            message: validationError,
            retryable: true,
          })
        }
      }

      const diff = buildDiff(localValue, currentRecord)
      const { template: nextTemplate } = await saveTemplateEntityInvolvementsSectionRequest(
        template.id,
        diff,
        template.updatedAt,
      )

      publishTemplate(nextTemplate)

      return {
        serverValue: nextTemplate,
        serverRevisionKey: createItemsRevisionKey(nextTemplate),
        noticeMessage: "Entity involvement saved",
      }
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        ...previous.items,
        {
          id: createLocalRecordRowId("template-entity-involvement"),
          entityId: null,
          entityName: null,
          entityType: null,
          involvementType: "",
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
    field: keyof TemplateEntityInvolvementLocal,
    value: string,
  ) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, [field]: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  // Snapshot the picked entity's id + name + type chip into the row atomically,
  // so selectedLabel and the read-only Type column populate instantly with no
  // server round-trip and never desync from entityId. Null clears the link.
  function selectEntity(itemId: string, option: EntityOption | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId
          ? {
              ...row,
              entityId: option?.id ?? null,
              entityName: option?.entity ?? null,
              entityType: option?.type ?? null,
            }
          : row,
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
    selectEntity,
  }
}
