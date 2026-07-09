import type { Prisma, PrismaClient } from "../generated/prisma/client.js"

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
  // Canonical unit FK + resolved unit (UoM epic 2A). `unit` resolves both name
  // (record picker label) and abbreviation (list/dense cells) in one join.
  unitId: true,
  unit: {
    select: {
      id: true,
      name: true,
      abbreviation: true,
    },
  },
  entityId: true,
  style: true,
  color: true,
  // Non-semantic palette tag. On the row/detail reads only — the skinny
  // `productOptionSelect` omits it (pickers don't render the chip).
  paletteColor: true,
  coveragePerUnit: true,
  // The product's own coverage unit FK + resolved unit (UoM epic 1a). Drives the
  // coverage-per-unit suffix in the record view. Nullable — null until picked.
  coverageUnitId: true,
  coverageUnit: {
    select: {
      id: true,
      name: true,
      abbreviation: true,
    },
  },
  // Money-standard cost + the unit it's priced per (record view + list "Cost /
  // Unit" cell). Nullable — null until the user sets them.
  cost: true,
  costUnitId: true,
  costUnit: {
    select: {
      id: true,
      name: true,
      abbreviation: true,
    },
  },
  productNamingAddon: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  category: {
    select: {
      id: true,
      name: true,
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
// additional query. Downstream row pickers seed a row's unit from the picked
// product; the option's unit label + abbrev derive from the `unit` join.
export const productOptionSelect = {
  id: true,
  name: true,
  categoryId: true,
  // Canonical unit FK (UoM epic 2A) + resolved unit (2B). Downstream row pickers
  // seed a row's unit from the picked product; the option's unit label + abbrev
  // derive solely from `unit` (snapshot columns fully de-referenced, 2D drops them).
  unitId: true,
  unit: { select: { name: true, abbreviation: true } },
  category: { select: { name: true } },
  // Live cost — seeds a row picker's pricing math for freshly-added rows.
  cost: true,
  style: true,
  color: true,
} as const

export type ProductRowPayload = Prisma.FlooringProductGetPayload<{ select: typeof productRowSelect }>
export type ProductDetailPayload = Prisma.FlooringProductGetPayload<{ select: typeof productDetailSelect }>
export type ProductOptionPayload = Prisma.FlooringProductGetPayload<{ select: typeof productOptionSelect }>
