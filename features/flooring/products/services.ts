import { Prisma } from "@prisma/client"
import { normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"

export function buildProductName(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

export function normalizeCatalogProduct(product: {
  id: string
  name: string
  categoryId: string
  manufacturerId: string | null
  manufacturerName: string | null
  style: string | null
  color: string | null
  width: string | null
  sheetSize: string | null
  thickness: string | null
  unitWeight: string | null
  baseColor: string | null
  coveragePerUnit: Prisma.Decimal | null
  photoUrls: string[]
  notes: string | null
  createdAt: Date
  updatedAt: Date
  category: {
    id: string
    name: string
    sendUnit: { id: string; name: string } | null
    stockUnit: { id: string; name: string } | null
    coverageAvailableUnit: { id: string; name: string } | null
    itemCoverageUnit: { id: string; name: string } | null
  }
  manufacturer: {
    id: string
    name: string
    companyName: string | null
    website: string | null
  } | null
}) {
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    manufacturerId: product.manufacturerId ?? "",
    manufacturerName: product.manufacturer?.companyName ?? product.manufacturer?.name ?? product.manufacturerName ?? "",
    style: product.style ?? "",
    color: product.color ?? "",
    width: product.width ?? "",
    sheetSize: product.sheetSize ?? "",
    thickness: product.thickness ?? "",
    unitWeight: product.unitWeight ?? "",
    baseColor: product.baseColor ?? "",
    coveragePerUnit: product.coveragePerUnit?.toString() ?? "",
    coverageUnit: product.category.itemCoverageUnit?.name ?? "",
    photoUrls: product.photoUrls,
    notes: product.notes ?? "",
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: {
      id: product.category.id,
      name: product.category.name,
      ...normalizeCategoryUnitValues(product.category),
    },
  }
}

export function normalizeProductOption(product: {
  id: string
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return {
    id: product.id,
    name: buildProductName(product),
  }
}
