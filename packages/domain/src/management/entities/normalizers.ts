import { buildAddressLine } from "../../shared/address/index.js"
import type { PaletteColor } from "../../shared/palette.js"
import { normalizePhoneNumber } from "../../shared/phone.js"
import type {
  EntityDetail,
  EntityListRow,
  EntityOption,
  EntityTypeRef,
} from "./types.js"

/** Shape of the joined entity-type rows as selected by the read repository. */
type EntityTypeLinkInput = {
  entityType: { id: string; type: string; color: PaletteColor }
}

function normalizeEntityTypeRefs(
  links: EntityTypeLinkInput[] | undefined,
): EntityTypeRef[] {
  return (links ?? []).map((link) => ({
    id: link.entityType.id,
    type: link.entityType.type,
    color: link.entityType.color,
  }))
}

type EntityDetailInput = {
  id: string
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
  entity: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  _count: { properties: number }
  entityTypes?: EntityTypeLinkInput[]
}

type EntityListRowInput = {
  id: string
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
  entity: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  _count: { properties: number }
  entityTypes?: EntityTypeLinkInput[]
}

export function normalizeEntity(entity: EntityDetailInput): EntityDetail {
  return {
    id: entity.id,
    createdAt: entity.createdAt instanceof Date ? entity.createdAt.toISOString() : entity.createdAt,
    updatedAt: entity.updatedAt instanceof Date ? entity.updatedAt.toISOString() : entity.updatedAt,
    createdBy: entity.createdBy,
    updatedBy: entity.updatedBy,
    entity: entity.entity,
    streetAddress: entity.streetAddress ?? "",
    city: entity.city ?? "",
    state: entity.state ?? "",
    zip: entity.postalCode ?? "",
    phone: normalizePhoneNumber(entity.phone ?? ""),
    email: entity.email ?? "",
    fullAddress: buildAddressLine(entity),
    propertyCount: entity._count.properties,
    types: normalizeEntityTypeRefs(entity.entityTypes),
  }
}

export function normalizeEntityListRow(entity: EntityListRowInput): EntityListRow {
  return {
    id: entity.id,
    createdAt: entity.createdAt instanceof Date ? entity.createdAt.toISOString() : entity.createdAt,
    updatedAt: entity.updatedAt instanceof Date ? entity.updatedAt.toISOString() : entity.updatedAt,
    createdBy: entity.createdBy,
    updatedBy: entity.updatedBy,
    entity: entity.entity,
    streetAddress: entity.streetAddress ?? "",
    city: entity.city ?? "",
    state: entity.state ?? "",
    zip: entity.postalCode ?? "",
    phone: normalizePhoneNumber(entity.phone ?? ""),
    email: entity.email ?? "",
    fullAddress: buildAddressLine(entity),
    propertyCount: entity._count.properties,
    types: normalizeEntityTypeRefs(entity.entityTypes),
  }
}

type EntityOptionInput = {
  id: string
  entity: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  entityTypes?: EntityTypeLinkInput[]
}

export function normalizeEntityOption(entity: EntityOptionInput): EntityOption {
  return {
    id: entity.id,
    entity: entity.entity,
    streetAddress: entity.streetAddress ?? "",
    city: entity.city ?? "",
    state: entity.state ?? "",
    zip: entity.postalCode ?? "",
    phone: normalizePhoneNumber(entity.phone ?? ""),
    email: entity.email ?? "",
    fullAddress: buildAddressLine(entity),
    types: normalizeEntityTypeRefs(entity.entityTypes),
  }
}
