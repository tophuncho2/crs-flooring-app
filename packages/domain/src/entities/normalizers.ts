import { toIsoTimestamp } from "../shared/date-format.js"
import { buildAddressLine } from "../shared/address/index.js"
import type { PaletteColor } from "../shared/palette.js"
import { normalizePhoneNumber } from "../shared/phone.js"
import type {
  EntityDetail,
  EntityListRow,
  EntityNeighbor,
  EntityOption,
  EntityTypeRef,
} from "./types.js"

export type EntityNeighbors = {
  previousEntity: EntityNeighbor | null
  nextEntity: EntityNeighbor | null
}

export const NO_ENTITY_NEIGHBORS: EntityNeighbors = {
  previousEntity: null,
  nextEntity: null,
}

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
  entityNumber: string
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
  color: PaletteColor
  _count: { properties: number }
  entityTypes?: EntityTypeLinkInput[]
}

type EntityListRowInput = {
  id: string
  entityNumber: string
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
  color: PaletteColor
  _count: { properties: number }
  entityTypes?: EntityTypeLinkInput[]
}

export function normalizeEntity(
  entity: EntityDetailInput,
  neighbors: EntityNeighbors = NO_ENTITY_NEIGHBORS,
): EntityDetail {
  return {
    id: entity.id,
    entityNumber: entity.entityNumber,
    createdAt: toIsoTimestamp(entity.createdAt),
    updatedAt: toIsoTimestamp(entity.updatedAt),
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
    color: entity.color,
    propertyCount: entity._count.properties,
    types: normalizeEntityTypeRefs(entity.entityTypes),
    previousEntity: neighbors.previousEntity,
    nextEntity: neighbors.nextEntity,
  }
}

export function normalizeEntityListRow(entity: EntityListRowInput): EntityListRow {
  return {
    id: entity.id,
    entityNumber: entity.entityNumber,
    createdAt: toIsoTimestamp(entity.createdAt),
    updatedAt: toIsoTimestamp(entity.updatedAt),
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
    color: entity.color,
    propertyCount: entity._count.properties,
    types: normalizeEntityTypeRefs(entity.entityTypes),
  }
}

type EntityOptionInput = {
  id: string
  entity: string
  entityNumber: string
  color: PaletteColor
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
    entityNumber: entity.entityNumber,
    color: entity.color,
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
