import {
  ENTITY_TYPE_TYPE_REQUIRED_MESSAGE,
  ENTITY_TYPE_TYPE_TOO_LONG_MESSAGE,
  ENTITY_TYPE_COLOR_INVALID_MESSAGE,
} from "./error-messages.js"
import { isEntityTypeColor } from "./palette.js"
import type { EntityTypeForm } from "./types.js"

export const ENTITY_TYPE_TYPE_MAX_LENGTH = 30

export function validateEntityTypeForm(input: EntityTypeForm) {
  if (!input.type.trim()) return ENTITY_TYPE_TYPE_REQUIRED_MESSAGE
  if (input.type.trim().length > ENTITY_TYPE_TYPE_MAX_LENGTH) return ENTITY_TYPE_TYPE_TOO_LONG_MESSAGE
  if (!isEntityTypeColor(input.color)) return ENTITY_TYPE_COLOR_INVALID_MESSAGE
  return ""
}
