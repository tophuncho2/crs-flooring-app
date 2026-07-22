// Service-item classification value object: the small REQUIRED set of types a
// template (and, later, a work-order) service line can carry. This is the
// persistence/validation source of truth; the matching Prisma enum is
// `ServiceItemType`, and the UI option labels are a data-driven sibling in the
// templates module (service-item-type-options.ts). Pure data, no I/O.

export const SERVICE_ITEM_TYPE_VALUES = ["LABOR", "MISCELLANEOUS"] as const

export type ServiceItemType = (typeof SERVICE_ITEM_TYPE_VALUES)[number]

export const DEFAULT_SERVICE_ITEM_TYPE: ServiceItemType = "LABOR"

export function isServiceItemType(value: unknown): value is ServiceItemType {
  return typeof value === "string" && (SERVICE_ITEM_TYPE_VALUES as readonly string[]).includes(value)
}

export const SERVICE_ITEM_TYPE_INVALID_MESSAGE = "Item type is invalid"
