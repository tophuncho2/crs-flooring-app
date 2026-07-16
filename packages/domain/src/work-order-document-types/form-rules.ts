import {
  WORK_ORDER_DOCUMENT_TYPE_NAME_REQUIRED_MESSAGE,
  WORK_ORDER_DOCUMENT_TYPE_NAME_TOO_LONG_MESSAGE,
} from "./error-messages.js"
import { isPaletteColor, PALETTE_COLOR_INVALID_MESSAGE } from "../shared/palette.js"
import type { WorkOrderDocumentTypeForm } from "./types.js"

export const WORK_ORDER_DOCUMENT_TYPE_NAME_MAX_LENGTH = 40

export function validateWorkOrderDocumentTypeForm(input: WorkOrderDocumentTypeForm) {
  if (!input.name.trim()) return WORK_ORDER_DOCUMENT_TYPE_NAME_REQUIRED_MESSAGE
  if (input.name.trim().length > WORK_ORDER_DOCUMENT_TYPE_NAME_MAX_LENGTH)
    return WORK_ORDER_DOCUMENT_TYPE_NAME_TOO_LONG_MESSAGE
  if (!isPaletteColor(input.color)) return PALETTE_COLOR_INVALID_MESSAGE
  return ""
}
