import type { Prisma, PrismaClient } from "@prisma/client"
import { categoryInclude } from "../categories/read-repository.js"

export type ProductsDbClient = PrismaClient | Prisma.TransactionClient

// Select shape for the standard product listing / detail reads.
// Includes category (with unit measures, via the canonical categoryInclude)
// and manufacturer (for the display-name fallback chain handled in normalizers).
export const productRowSelect = {
  id: true,
  name: true,
  categoryId: true,
  manufacturerId: true,
  manufacturerName: true,
  style: true,
  color: true,
  width: true,
  sheetSize: true,
  thickness: true,
  unitWeight: true,
  coveragePerUnit: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      slug: true,
      name: true,
      ...categoryInclude,
    },
  },
  manufacturer: {
    select: {
      id: true,
      companyName: true,
    },
  },
} as const

// Detail shape is the same as row — products have no sub-collections today.
// Kept distinct in the type system so future additions (e.g., inventory snapshot)
// don't force churn through every call site.
export const productDetailSelect = productRowSelect

// Skinny shape for picker dropdowns.
export const productOptionSelect = {
  id: true,
  name: true,
  style: true,
  color: true,
} as const

export type ProductRowPayload = Prisma.FlooringProductGetPayload<{ select: typeof productRowSelect }>
export type ProductDetailPayload = ProductRowPayload
export type ProductOptionPayload = Prisma.FlooringProductGetPayload<{ select: typeof productOptionSelect }>
