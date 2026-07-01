import type { ProductRecord } from "@builders/db"
import type { PaletteColor } from "@builders/domain"

// Input types consumed by the product use cases. These are what the route-edge
// `_validators.ts` produces — pre-parsed / pre-typed but not yet resolved against
// dependent records (category, entity).

export type CreateProductInput = {
  categoryId: string
  // Unit-of-measure FK (UoM epic 2A). Required — resolved from the UoM picker.
  unitId: string
  entityId: string | null
  style: string | null
  color: string | null
  // Mutable on create AND update. Canonical decimal string (mirrors inventory
  // `startingStock`); Prisma coerces it to the Decimal column. null clears it.
  coveragePerUnit: string | null
  productNamingAddon: string | null
}

// Update input carries the same fields (all optional). `categoryId` and `unitId`
// are now MUTABLE (UoM epic 2A retired the immutable unit snapshots); a category
// change recomposes the stored product name in `update-product`.
// `paletteColor` is the non-semantic palette tag — update-only (create never
// carries it; new rows default to SLATE in the DB). Metadata-only passthrough.
export type UpdateProductInput = Partial<CreateProductInput> & {
  paletteColor?: PaletteColor
}

export type ProductResult = ProductRecord
