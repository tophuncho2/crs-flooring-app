import type { Prisma, ProductRecord } from "@builders/db"

// Input types consumed by the product use cases. These are what the route-edge
// `_validators.ts` produces — pre-parsed / pre-typed but not yet resolved against
// dependent records (category, manufacturer).

export type CreateProductInput = {
  categoryId: string
  manufacturerId: string | null
  style: string | null
  color: string | null
  // Mutable on create AND update. Parsed/validated to a Prisma.Decimal at the
  // route edge; null clears it.
  coveragePerUnit: Prisma.Decimal | null
  note: string | null
}

// Update form omits `categoryId` — immutable post-create. Mirrors the domain
// `ProductUpdateForm`, the data layer `UpdateProductInput`, and the API PATCH
// validator carve-out. Defense in depth: even if a caller bypasses these gates,
// the data layer's `updateProduct` won't accept it.
export type UpdateProductInput = Partial<Omit<CreateProductInput, "categoryId">>

export type ProductResult = ProductRecord
