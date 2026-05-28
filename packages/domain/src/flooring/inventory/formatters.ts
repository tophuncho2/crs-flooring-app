import { formatEasternDateTime } from "../../shared/date-format.js"

export function parseInventoryDecimal(value: string): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function toInventoryFixedString(value: number): string {
  return value.toFixed(2)
}

export function formatInventoryImportNumber(value: string): string {
  return value ? `IMP-${value}` : "-"
}

export function formatInventoryQuantity(value: string, unitLabel: string): string {
  return `${value} ${unitLabel}`.trim()
}

export type ComposeInventoryItemInput = {
  inventoryNumber: string
  rollPrefix: string
  rollNumber: string
  dyeLot: string
  note: string
}

const INVENTORY_ITEM_SEPARATOR = " · "

export function composeRollNumberDisplay(prefix: string, number: string): string {
  const trimmed = number.trim()
  if (trimmed.length === 0) return ""
  return `${prefix}${trimmed}`
}

export function composeInventoryItem(input: ComposeInventoryItemInput): string {
  const rollDisplay = composeRollNumberDisplay(input.rollPrefix, input.rollNumber)
  const parts = [
    input.inventoryNumber,
    rollDisplay,
    input.dyeLot,
    input.note,
  ]
  return parts.filter((part) => part.length > 0).join(INVENTORY_ITEM_SEPARATOR)
}

export function formatFifoReceivedAtEastern(value: Date | string): string {
  return formatEasternDateTime(value)
}
