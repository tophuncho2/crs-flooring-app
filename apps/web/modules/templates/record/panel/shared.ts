"use client"

import {
  createLocalRecordRowId,
  isLocalOnlyRecordRow,
} from "@/modules/shared/engines/record-view"
import type { EditableMaterialItem } from "@/modules/shared/engines/record-view/contracts/material-item-contracts"
import type { EditableServiceItem } from "@/modules/shared/engines/record-view/contracts/service-item-contracts"
import type { DraftTemplate, TemplateDetail } from "@/modules/templates/types"

function normalizeComparableText(value: string | null | undefined) {
  return value ?? ""
}

function normalizeComparableDecimal(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""
  if (!normalized) {
    return ""
  }

  const asNumber = Number(normalized)
  return Number.isFinite(asNumber) ? String(asNumber) : normalized
}

function buildComparableDraftTemplateFingerprint(draft: DraftTemplate) {
  return [
    draft.templateTag,
    draft.propertyId,
    draft.warehouseId,
    draft.instructions,
    draft.templateNotes,
    draft.padProductId,
  ].join("|")
}

function buildComparableMaterialItemFingerprint(item: EditableMaterialItem) {
  return [
    item.id,
    item.productId,
    normalizeComparableDecimal(item.quantity),
    normalizeComparableDecimal(item.unitPrice),
    normalizeComparableText(item.notes),
  ].join("|")
}

function buildComparableServiceItemFingerprint(item: EditableServiceItem) {
  return [
    item.id,
    item.serviceId,
    normalizeComparableText(item.name),
    item.unitId,
    normalizeComparableDecimal(item.quantity),
    normalizeComparableDecimal(item.unitPrice),
    normalizeComparableText(item.notes),
  ].join("|")
}

function buildComparableSalesRepFingerprint(item: TemplateDetail["salesReps"][number]) {
  return [
    item.id,
    item.contactId,
    normalizeComparableDecimal(item.percent),
  ].join("|")
}

export const createLocalRowId = createLocalRecordRowId
export const isLocalOnlyRow = isLocalOnlyRecordRow

export function toTemplateDraft(template: TemplateDetail): DraftTemplate {
  return {
    templateTag: template.templateTag,
    propertyId: template.propertyId,
    warehouseId: template.warehouseId,
    instructions: template.instructions,
    templateNotes: template.templateNotes,
    padProductId: template.padProductId,
  }
}

export function cloneDraftTemplate(draft: DraftTemplate): DraftTemplate {
  return { ...draft }
}

export function areTemplateDraftsEqual(left: DraftTemplate, right: DraftTemplate) {
  return buildComparableDraftTemplateFingerprint(left) === buildComparableDraftTemplateFingerprint(right)
}

export function cloneMaterialItems(items: EditableMaterialItem[]) {
  return (items ?? []).map((item) => ({ ...item }))
}

export function areMaterialItemsEqual(left: EditableMaterialItem[], right: EditableMaterialItem[]) {
  const safeLeft = left ?? []
  const safeRight = right ?? []
  if (safeLeft.length !== safeRight.length) {
    return false
  }

  return safeLeft.every(
    (item, index) => buildComparableMaterialItemFingerprint(item) === buildComparableMaterialItemFingerprint(safeRight[index]),
  )
}

export function cloneServiceItems(items: EditableServiceItem[]) {
  return (items ?? []).map((item) => ({ ...item }))
}

export function areServiceItemsEqual(left: EditableServiceItem[], right: EditableServiceItem[]) {
  const safeLeft = left ?? []
  const safeRight = right ?? []
  if (safeLeft.length !== safeRight.length) {
    return false
  }

  return safeLeft.every(
    (item, index) => buildComparableServiceItemFingerprint(item) === buildComparableServiceItemFingerprint(safeRight[index]),
  )
}

export function cloneSalesRepItems(items: TemplateDetail["salesReps"]) {
  return (items ?? []).map((item) => ({ ...item }))
}

export function areSalesRepItemsEqual(left: TemplateDetail["salesReps"], right: TemplateDetail["salesReps"]) {
  const safeLeft = left ?? []
  const safeRight = right ?? []
  if (safeLeft.length !== safeRight.length) {
    return false
  }

  return safeLeft.every(
    (item, index) => buildComparableSalesRepFingerprint(item) === buildComparableSalesRepFingerprint(safeRight[index]),
  )
}

export function createEmptyMaterialItem(): EditableMaterialItem {
  return {
    id: createLocalRowId("template-material"),
    productId: "",
    productName: "",
    sendUnit: "",
    quantity: "",
    unitPrice: "",
    notes: "",
    updatedAt: "",
  }
}

export function createEmptyServiceItem(): EditableServiceItem {
  return {
    id: createLocalRowId("template-service"),
    serviceId: "",
    name: "",
    unitId: "",
    unitName: "",
    quantity: "",
    unitPrice: "",
    notes: "",
    updatedAt: "",
  }
}

export function createEmptySalesRepItem(): TemplateDetail["salesReps"][number] {
  return {
    id: createLocalRowId("template-sales-rep"),
    contactId: "",
    contactName: "",
    percent: "",
    updatedAt: "",
  }
}
