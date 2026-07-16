import { toIsoTimestamp } from "../shared/date-format.js"
import { parseWorkOrderPrintConfig } from "./types.js"
import type { WorkOrderDocumentType, WorkOrderDocumentTypeOption } from "./types.js"
import type { PaletteColor } from "../shared/palette.js"

type WorkOrderDocumentTypeInput = {
  id: string
  workOrderDocumentTypeNumber: string
  name: string
  color: PaletteColor
  printConfig: unknown
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeWorkOrderDocumentType(
  documentType: WorkOrderDocumentTypeInput,
): WorkOrderDocumentType {
  return {
    id: documentType.id,
    workOrderDocumentTypeNumber: documentType.workOrderDocumentTypeNumber,
    name: documentType.name,
    color: documentType.color,
    printConfig: parseWorkOrderPrintConfig(documentType.printConfig),
    createdAt: toIsoTimestamp(documentType.createdAt),
    updatedAt: toIsoTimestamp(documentType.updatedAt),
    createdBy: documentType.createdBy,
    updatedBy: documentType.updatedBy,
  }
}

export function normalizeWorkOrderDocumentTypeOption(input: {
  id: string
  name: string
  color: PaletteColor
  printConfig: unknown
}): WorkOrderDocumentTypeOption {
  return {
    id: input.id,
    name: input.name,
    color: input.color,
    printConfig: parseWorkOrderPrintConfig(input.printConfig),
  }
}
