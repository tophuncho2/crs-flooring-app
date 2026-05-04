import type { Prisma, PrismaClient } from "@prisma/client"

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
  width: true,
  sheetSize: true,
  thickness: true,
  unitWeight: true,
  coveragePerUnit: true,
  sendUnitName: true,
  sendUnitAbbrev: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
  itemCoverageUnitName: true,
  itemCoverageUnitAbbrev: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      slug: true,
      name: true,
      sendUnitId: true,
      stockUnitId: true,
      itemCoverageUnitId: true,
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
// additional query, plus the send-unit snapshot so material-item grids can
// render the unit suffix beside the quantity input without a second fetch.
export const productOptionSelect = {
  id: true,
  name: true,
  categoryId: true,
  style: true,
  color: true,
  sendUnitName: true,
  sendUnitAbbrev: true,
} as const

// Select shape for the canonical product picker (server-side search). Joins
// the category name so the picker can render a category subtitle without an
// extra fetch, and so consumers hydrating an existing selection can derive
// the category-filter trigger label from the same record.
export const productPickerSelect = {
  id: true,
  name: true,
  categoryId: true,
  sendUnitAbbrev: true,
  category: { select: { name: true } },
} as const

export type ProductRowPayload = Prisma.FlooringProductGetPayload<{ select: typeof productRowSelect }>
export type ProductDetailPayload = ProductRowPayload
export type ProductOptionPayload = Prisma.FlooringProductGetPayload<{ select: typeof productOptionSelect }>
export type ProductPickerPayload = Prisma.FlooringProductGetPayload<{ select: typeof productPickerSelect }>
