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
  TemplateInvoiceItemForm,
  TemplateInvoiceItemRow,
  TemplateInvoiceItemsDiff,
} from "@builders/domain"
import { validateTemplateInvoiceItemForm } from "@builders/domain"
import { saveTemplateInvoiceItemsSectionRequest } from "@/modules/templates/data/mutations"

export type TemplateInvoiceItemLocal = {
  id: string
  // Unsigned money magnitude ("X.XX"); MoneyCell normalizes on blur so local
  // state matches the server round-trip. Required on save.
  amount: string
  // REVENUE | EXPENSE — carries the amount's sign and the cell chip's tone.
  direction: FlooringPaymentDirection
  // Short free-text note; "" = unset (persisted NULL).
  notes: string
}

type TemplateInvoiceItemsLocalState = {
  items: TemplateInvoiceItemLocal[]
}

function toLocalItem(row: TemplateInvoiceItemRow): TemplateInvoiceItemLocal {
  return {
    id: row.id,
    amount: row.amount,
    direction: row.direction,
    notes: row.notes,
  }
}

function createLocalState(record: TemplateDetail): TemplateInvoiceItemsLocalState {
  return { items: record.invoiceItems.map(toLocalItem) }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify(
    record.invoiceItems.map((row) => `${row.id}:${row.amount}:${row.direction}:${row.notes}`),
  )
}

function itemsDiffer(local: TemplateInvoiceItemLocal, server: TemplateInvoiceItemRow) {
  return (
    local.amount !== server.amount ||
    local.direction !== server.direction ||
    local.notes !== server.notes
  )
}

function toDiffForm(local: TemplateInvoiceItemLocal): TemplateInvoiceItemForm {
  return {
    amount: local.amount,
    direction: local.direction,
    notes: local.notes,
  }
}

function buildDiff(
  local: TemplateInvoiceItemsLocalState,
  server: TemplateDetail,
): TemplateInvoiceItemsDiff {
  // Add appends at the bottom (no reverseAdded), matching the section policy.
  return buildRowDiff({
    locals: local.items,
    serverRows: server.invoiceItems,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: itemsDiffer,
    toAdded: (item) => ({ tempId: item.id, form: toDiffForm(item) }),
    toModified: (item) => ({ id: item.id, form: toDiffForm(item) }),
  })
}

export function useTemplateInvoiceItemsSection({
  template,
  publishTemplate,
}: {
  template: TemplateDetail
  publishTemplate: (record: TemplateDetail) => void
}) {
  const section = useRecordScopedSectionController<TemplateDetail, TemplateInvoiceItemsLocalState>({
    recordId: template.id,
    sectionKey: "invoice-items",
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
        const validationError = validateTemplateInvoiceItemForm(toDiffForm(item))
        if (validationError) {
          throw createRecordSectionError({
            kind: "validation",
            message: validationError,
            retryable: true,
          })
        }
      }

      const diff = buildDiff(localValue, currentRecord)
      const { template: nextTemplate } = await saveTemplateInvoiceItemsSectionRequest(
        template.id,
        diff,
        template.updatedAt,
      )

      publishTemplate(nextTemplate)

      return {
        serverValue: nextTemplate,
        serverRevisionKey: createItemsRevisionKey(nextTemplate),
        noticeMessage: "Invoice items saved",
      }
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        ...previous.items,
        {
          id: createLocalRecordRowId("template-invoice-item"),
          amount: "",
          direction: "REVENUE",
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
    field: keyof TemplateInvoiceItemLocal,
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
