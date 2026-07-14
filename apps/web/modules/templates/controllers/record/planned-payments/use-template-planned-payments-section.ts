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
  FlooringPaymentDirection,
  PaletteColor,
  PaymentPurposeOption,
  TemplateDetail,
  TemplatePlannedPaymentForm,
  TemplatePlannedPaymentRow,
  TemplatePlannedPaymentsDiff,
} from "@builders/domain"
import { validateTemplatePlannedPaymentForm } from "@builders/domain"
import { saveTemplatePlannedPaymentsSectionRequest } from "@/modules/templates/data/mutations"

export type TemplatePlannedPaymentLocal = {
  id: string
  // Unsigned money magnitude ("X.XX"); MoneyCell normalizes on blur so local
  // state matches the server round-trip. Required on save.
  amount: string
  // REVENUE | EXPENSE — carries the amount's sign and the cell chip's tone.
  direction: FlooringPaymentDirection
  // Short free-text note; "" = unset (persisted NULL).
  notes: string
  // Optional entity link (null = unlinked) — the only writable/diffed link field.
  entityId: string | null
  // Read-only hydration co-located with entityId so the picker's selectedLabel
  // and the Type(s) chips can never desync from the id (grid label-contract fix).
  // Never sent on save; seeded from the row on load, snapshotted on pick.
  entityName: string | null
  entityTypes: EntityTypeRef[]
  // Optional payment-purpose link (null = unlinked) — writable/diffed.
  paymentPurposeId: string | null
  // Read-only hydration co-located with paymentPurposeId so the picker chip's
  // label + color never desync from the id. Never sent on save.
  paymentPurposeName: string | null
  paymentPurposeColor: PaletteColor | null
}

type TemplatePlannedPaymentsLocalState = {
  items: TemplatePlannedPaymentLocal[]
}

function toLocalItem(row: TemplatePlannedPaymentRow): TemplatePlannedPaymentLocal {
  return {
    id: row.id,
    amount: row.amount,
    direction: row.direction,
    notes: row.notes,
    entityId: row.entityId,
    entityName: row.entityName,
    entityTypes: row.entityTypes,
    paymentPurposeId: row.paymentPurposeId,
    paymentPurposeName: row.paymentPurposeName,
    paymentPurposeColor: row.paymentPurposeColor,
  }
}

function createLocalState(record: TemplateDetail): TemplatePlannedPaymentsLocalState {
  return { items: record.plannedPayments.map(toLocalItem) }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify(
    record.plannedPayments.map(
      (row) =>
        `${row.id}:${row.amount}:${row.direction}:${row.notes}:${row.entityId}:${row.paymentPurposeId}`,
    ),
  )
}

function itemsDiffer(local: TemplatePlannedPaymentLocal, server: TemplatePlannedPaymentRow) {
  return (
    local.amount !== server.amount ||
    local.direction !== server.direction ||
    local.notes !== server.notes ||
    local.entityId !== server.entityId ||
    local.paymentPurposeId !== server.paymentPurposeId
  )
}

function toDiffForm(local: TemplatePlannedPaymentLocal): TemplatePlannedPaymentForm {
  return {
    amount: local.amount,
    direction: local.direction,
    notes: local.notes,
    // Only the writable links — the *Name/*Types/*Color fields are display
    // hydration and must never enter the diff form.
    entityId: local.entityId,
    paymentPurposeId: local.paymentPurposeId,
  }
}

function buildDiff(
  local: TemplatePlannedPaymentsLocalState,
  server: TemplateDetail,
): TemplatePlannedPaymentsDiff {
  // Add appends at the bottom (no reverseAdded), matching the section policy.
  return buildRowDiff({
    locals: local.items,
    serverRows: server.plannedPayments,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: itemsDiffer,
    toAdded: (item) => ({ tempId: item.id, form: toDiffForm(item) }),
    toModified: (item) => ({ id: item.id, form: toDiffForm(item) }),
  })
}

export function useTemplatePlannedPaymentsSection({
  template,
  publishTemplate,
}: {
  template: TemplateDetail
  publishTemplate: (record: TemplateDetail) => void
}) {
  const section = useRecordScopedSectionController<TemplateDetail, TemplatePlannedPaymentsLocalState>({
    recordId: template.id,
    sectionKey: "planned-payments",
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
        const validationError = validateTemplatePlannedPaymentForm(toDiffForm(item))
        if (validationError) {
          throw createRecordSectionError({
            kind: "validation",
            message: validationError,
            retryable: true,
          })
        }
      }

      const diff = buildDiff(localValue, currentRecord)
      const { template: nextTemplate } = await saveTemplatePlannedPaymentsSectionRequest(
        template.id,
        diff,
        template.updatedAt,
      )

      publishTemplate(nextTemplate)

      return {
        serverValue: nextTemplate,
        serverRevisionKey: createItemsRevisionKey(nextTemplate),
        noticeMessage: "Planned payments saved",
      }
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        ...previous.items,
        {
          id: createLocalRecordRowId("template-planned-payment"),
          amount: "",
          direction: "EXPENSE",
          notes: "",
          entityId: null,
          entityName: null,
          entityTypes: [],
          paymentPurposeId: null,
          paymentPurposeName: null,
          paymentPurposeColor: null,
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
    field: keyof TemplatePlannedPaymentLocal,
    value: string,
  ) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, [field]: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  // Snapshot the picked entity's id + name + type chips into the row atomically,
  // so selectedLabel and the read-only Type(s) column populate instantly with no
  // server round-trip and never desync from entityId. Null clears the link.
  function selectEntity(itemId: string, option: EntityOption | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId
          ? {
              ...row,
              entityId: option?.id ?? null,
              entityName: option?.entity ?? null,
              entityTypes: option?.types ?? [],
            }
          : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  // Snapshot the picked purpose's id + name + color into the row atomically, so
  // the picker chip's label + color populate instantly with no server round-trip
  // and never desync from paymentPurposeId. Null clears the link.
  function selectPaymentPurpose(itemId: string, option: PaymentPurposeOption | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId
          ? {
              ...row,
              paymentPurposeId: option?.id ?? null,
              paymentPurposeName: option?.name ?? null,
              paymentPurposeColor: option?.color ?? null,
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
    selectPaymentPurpose,
  }
}
