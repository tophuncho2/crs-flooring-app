import type { ProductRecord } from "@builders/db"
import type { PaletteColor } from "@builders/domain"

// Input types consumed by the product use cases. These are what the route-edge
// `_validators.ts` produces — pre-parsed / pre-typed but not yet resolved against
// dependent records (category, entity).

export type CreateProductInput = {
  categoryId: string
  entityId: string | null
  style: string | null
  color: string | null
  // Mutable on create AND update. Canonical decimal string (mirrors inventory
  // `startingStock`); Prisma coerces it to the Decimal column. null clears it.
  coveragePerUnit: string | null
  productNamingAddon: string | null
}

// Update form omits `categoryId` — immutable post-create. Mirrors the domain
// `ProductUpdateForm`, the data layer `UpdateProductInput`, and the API PATCH
// validator carve-out. Defense in depth: even if a caller bypasses these gates,
// the data layer's `updateProduct` won't accept it.
// `paletteColor` is the non-semantic palette tag — update-only (create never
// carries it; new rows default to SLATE in the DB). Metadata-only passthrough.
export type UpdateProductInput = Partial<Omit<CreateProductInput, "categoryId">> & {
  paletteColor?: PaletteColor
}

export type ProductResult = ProductRecord
