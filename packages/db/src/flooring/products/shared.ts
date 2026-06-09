import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

export type ProductsDbClient = PrismaClient | Prisma.TransactionClient

// Select shape for the standard product listing / detail reads.
//
// Pulls the unit-of-measure name + abbreviation snapshots directly off the
// product row (sweep that landed migration `20260428230000_add_product_unit_snapshots`).
// The category projection no longer joins through `category → unit_of_measure`
// — it carries IDs only. Reads are flat, single-table for the unit data.
export const productRowSelect = {
  id: true,
  name: true,
  categoryId: true,
  manufacturerId: true,
  manufacturerName: true,
  style: true,
  color: true,
  sendUnitName: true,
  sendUnitAbbrev: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      slug: true,
      name: true,
      sendUnitId: true,
      stockUnitId: true,
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

// Skinny shape for picker dropdowns. Includes `categoryId` so consumers can
// implement category-scoped product filtering in row pickers without an
// additional query, plus BOTH unit snapshots (send + stock) so material-item
// grids and staged-inventory-rows grids can render their respective unit
// suffixes beside numeric inputs without a second fetch.
export const productOptionSelect = {
  id: true,
  name: true,
  categoryId: true,
  category: { select: { name: true } },
  style: true,
  color: true,
  sendUnitName: true,
  sendUnitAbbrev: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
} as const

export type ProductRowPayload = Prisma.FlooringProductGetPayload<{ select: typeof productRowSelect }>
export type ProductDetailPayload = ProductRowPayload
export type ProductOptionPayload = Prisma.FlooringProductGetPayload<{ select: typeof productOptionSelect }>
