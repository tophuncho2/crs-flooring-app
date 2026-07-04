import type { EntityForm } from "../entities/types.js"
import { validateEntityForm } from "../entities/form-rules.js"
import { isBlankName } from "../shared/name-rules.js"
import {
  PROPERTY_HUB_NO_ACTIONS_MESSAGE,
  PROPERTY_HUB_LINK_REQUIRES_PROPERTY_MESSAGE,
  PROPERTY_NAME_REQUIRED_MESSAGE,
} from "./error-messages.js"

export type PropertyHubPropertyFields = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  instructions: string
}

export type PropertyHubEntitySelection =
  | { mode: "none" }
  | { mode: "link"; id: string }
  | { mode: "create"; fields: EntityForm }

export type PropertyHubPropertySelection =
  | { mode: "none" }
  | { mode: "link"; id: string }
  | { mode: "create"; fields: PropertyHubPropertyFields }

export type CreatePropertyHubForm = {
  entity: PropertyHubEntitySelection
  property: PropertyHubPropertySelection
}

export const EMPTY_PROPERTY_HUB_PROPERTY_FIELDS: PropertyHubPropertyFields = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  instructions: "",
}

export function validateCreatePropertyHubForm(form: CreatePropertyHubForm): string {
  const hasEntityCreate = form.entity.mode === "create"
  const hasPropertyCreate = form.property.mode === "create"

  // New flow: link an existing property to a (new or existing) entity. The
  // property already exists, so the create-flow guards below don't apply — only
  // require a real entity action to perform.
  if (form.property.mode === "link") {
    if (!form.property.id || form.entity.mode === "none") {
      return PROPERTY_HUB_NO_ACTIONS_MESSAGE
    }
    if (form.entity.mode === "create") {
      const entityError = validateEntityForm(form.entity.fields)
      if (entityError) return entityError
    }
    return ""
  }

  // Order matters: a "link" selection is not a "create", so the
  // link-requires-property case must be checked before the no-actions guard —
  // otherwise "link an entity but create no property" would fall through to the
  // generic no-actions message instead of the specific one.
  if (form.entity.mode === "link" && !hasPropertyCreate) {
    return PROPERTY_HUB_LINK_REQUIRES_PROPERTY_MESSAGE
  }

  if (!hasEntityCreate && !hasPropertyCreate) {
    return PROPERTY_HUB_NO_ACTIONS_MESSAGE
  }

  if (form.entity.mode === "create") {
    const entityError = validateEntityForm(form.entity.fields)
    if (entityError) return entityError
  }

  if (form.property.mode === "create" && isBlankName(form.property.fields.name)) {
    return PROPERTY_NAME_REQUIRED_MESSAGE
  }

  return ""
}
