import type { ProductRecord } from "@builders/db"

// Input types consumed by the product use cases. These are what the route-edge
// `_validators.ts` produces — pre-parsed / pre-typed but not yet resolved against
// dependent records (category, manufacturer).

export type CreateProductInput = {
  categoryId: string
  manufacturerId: string | null
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
export type UpdateProductInput = Partial<Omit<CreateProductInput, "categoryId">>

export type ProductResult = ProductRecord
