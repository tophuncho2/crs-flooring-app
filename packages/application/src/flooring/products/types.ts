import type { Prisma, ProductRecord } from "@builders/db"

// Input types consumed by the product use cases. These are what the route-edge
// `_validators.ts` produces — pre-parsed / pre-typed but not yet resolved against
// dependent records (category, manufacturer).

export type CreateProductInput = {
  categoryId: string
  manufacturerId: string | null
  style: string | null
  color: string | null
  width: string | null
  sheetSize: string | null
  thickness: string | null
  unitWeight: string | null
  coveragePerUnit: Prisma.Decimal | null
  notes: string | null
}

// Update form omits `categoryId` — category is immutable post-create. Mirrors
// the domain `ProductUpdateForm`, the data layer `UpdateProductInput`, and the
// API PATCH validator carve-out. Defense in depth: even if a caller bypasses
// these gates, the data layer's `updateProduct` won't accept categoryId either.
export type UpdateProductInput = Partial<Omit<CreateProductInput, "categoryId">>

export type ProductResult = ProductRecord
