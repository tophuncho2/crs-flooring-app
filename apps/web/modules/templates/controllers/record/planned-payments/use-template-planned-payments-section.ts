"use client"

import {
  buildRowDiff,
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/engines/record-view"
import type {
  FlooringPaymentDirection,
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
  // "" = unset (persisted NULL). DateCell edits it as YYYY-MM-DD.
  paymentDate: string
  // Short free-text note; "" = unset (persisted NULL).
  notes: string
}

type TemplatePlannedPaymentsLocalState = {
  items: TemplatePlannedPaymentLocal[]
}

function toLocalItem(row: TemplatePlannedPaymentRow): TemplatePlannedPaymentLocal {
  return {
    id: row.id,
    amount: row.amount,
    direction: row.direction,
    paymentDate: row.paymentDate,
    notes: row.notes,
  }
}

function createLocalState(record: TemplateDetail): TemplatePlannedPaymentsLocalState {
  return { items: record.plannedPayments.map(toLocalItem) }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify(
    record.plannedPayments.map(
      (row) => `${row.id}:${row.amount}:${row.direction}:${row.paymentDate}:${row.notes}`,
    ),
  )
}

function itemsDiffer(local: TemplatePlannedPaymentLocal, server: TemplatePlannedPaymentRow) {
  return (
    local.amount !== server.amount ||
    local.direction !== server.direction ||
    local.paymentDate !== server.paymentDate ||
    local.notes !== server.notes
  )
}

function toDiffForm(local: TemplatePlannedPaymentLocal): TemplatePlannedPaymentForm {
  return {
    amount: local.amount,
    direction: local.direction,
    paymentDate: local.paymentDate,
    notes: local.notes,
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
          direction: "REVENUE",
          paymentDate: "",
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

  return {
    ...section,
    items: section.localValue.items,
    addItem,
    removeItem,
    changeField,
  }
}
