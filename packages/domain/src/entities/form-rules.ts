import { isBlankName } from "../shared/name-rules.js"
import type { EntityDetail, EntityForm } from "./types.js"

export function toEntityForm(entity: EntityDetail): EntityForm {
  return {
    entity: entity.entity,
    streetAddress: entity.streetAddress,
    city: entity.city,
    state: entity.state,
    zip: entity.zip,
    phone: entity.phone,
    email: entity.email,
    typeId: entity.type?.id ?? null,
    color: entity.color,
  }
}

export function validateEntityForm(input: EntityForm) {
  if (isBlankName(input.entity)) {
    return "Entity name is required"
  }

  return ""
}
