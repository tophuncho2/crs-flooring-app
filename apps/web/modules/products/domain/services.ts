import { Prisma } from "@builders/db"
import { normalizeCategoryUnitValues } from "@/server/categories/unit-measures"
import { buildFlooringProductDisplayName, buildStoredFlooringProductName } from "@builders/domain"

export function buildProductName(product: {
  name?: string | null
  categoryName?: string | null
  style: string | null
  color: string | null
}) {
  return buildFlooringProductDisplayName(product)
}

export function buildStoredProductName(product: {
  categoryName: string | null
  style: string | null
  color: string | null
}) {
  return buildStoredFlooringProductName(product)
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
    serviceUnit: { id: string; name: string } | null
  }
  manufacturer: {
    id: string
    agentName: string | null
    companyName: string | null
    website: string | null
  } | null
}) {
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    manufacturerId: product.manufacturerId ?? "",
    manufacturerName: product.manufacturer?.companyName ?? product.manufacturer?.agentName ?? product.manufacturerName ?? "",
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
  name: string
  categoryName?: string | null
  style: string | null
  color: string | null
}) {
  return {
    id: product.id,
    name: buildProductName(product),
  }
}
