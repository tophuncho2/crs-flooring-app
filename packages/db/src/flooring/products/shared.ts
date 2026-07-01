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
  productNumber: true,
  name: true,
  categoryId: true,
  entityId: true,
  style: true,
  color: true,
  // Non-semantic palette tag. On the row/detail reads only — the skinny
  // `productOptionSelect` omits it (pickers don't render the chip).
  paletteColor: true,
  sendUnitName: true,
  sendUnitAbbrev: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
  coveragePerUnit: true,
  productNamingAddon: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  category: {
    select: {
      id: true,
      slug: true,
      name: true,
      sendUnitId: true,
      stockUnitId: true,
    },
  },
  entity: {
    select: {
      id: true,
      entity: true,
    },
  },
} as const

// Detail shape extends row with `productNumberInt` — the generated numeric sort
// key the record-view stepper reads to resolve prev/next neighbors. The list
// view doesn't need it, so it stays off `productRowSelect`.
export const productDetailSelect = {
  ...productRowSelect,
  productNumberInt: true,
} as const

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
export type ProductDetailPayload = Prisma.FlooringProductGetPayload<{ select: typeof productDetailSelect }>
export type ProductOptionPayload = Prisma.FlooringProductGetPayload<{ select: typeof productOptionSelect }>
