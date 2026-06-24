import { buildAddressLine } from "../../shared/address/index.js"
import { normalizePhoneNumber } from "../../shared/phone.js"
import type {
  EntityDetail,
  EntityListRow,
  EntityOption,
} from "./types.js"

type EntityDetailInput = {
  id: string
  createdAt: Date | string
  updatedAt: Date | string
  entity: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  _count: { properties: number }
}

type EntityListRowInput = {
  id: string
  createdAt: Date | string
  updatedAt: Date | string
  entity: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  _count: { properties: number }
}

export function normalizeEntity(entity: EntityDetailInput): EntityDetail {
  return {
    id: entity.id,
    createdAt: entity.createdAt instanceof Date ? entity.createdAt.toISOString() : entity.createdAt,
    updatedAt: entity.updatedAt instanceof Date ? entity.updatedAt.toISOString() : entity.updatedAt,
    entity: entity.entity,
    streetAddress: entity.streetAddress ?? "",
    city: entity.city ?? "",
    state: entity.state ?? "",
    zip: entity.postalCode ?? "",
    phone: normalizePhoneNumber(entity.phone ?? ""),
    email: entity.email ?? "",
    fullAddress: buildAddressLine(entity),
    propertyCount: entity._count.properties,
  }
}

export function normalizeEntityListRow(entity: EntityListRowInput): EntityListRow {
  return {
    id: entity.id,
    createdAt: entity.createdAt instanceof Date ? entity.createdAt.toISOString() : entity.createdAt,
    updatedAt: entity.updatedAt instanceof Date ? entity.updatedAt.toISOString() : entity.updatedAt,
    entity: entity.entity,
    streetAddress: entity.streetAddress ?? "",
    city: entity.city ?? "",
    state: entity.state ?? "",
    zip: entity.postalCode ?? "",
    phone: normalizePhoneNumber(entity.phone ?? ""),
    email: entity.email ?? "",
    fullAddress: buildAddressLine(entity),
    propertyCount: entity._count.properties,
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
  }
}
