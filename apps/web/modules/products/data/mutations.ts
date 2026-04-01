import { prisma } from "@builders/db"
import { flooringCategoryUnitInclude } from "@/server/categories/unit-measures"
import { createAppError } from "@/server/http/api-helpers"
import { buildStoredProductName, normalizeCatalogProduct } from "../domain/services"
import type { CreateProductInput, UpdateProductInput } from "../domain/validators"

async function resolveManufacturerName(manufacturerId: string | null | undefined) {
  if (!manufacturerId) {
    return null
  }

  const manufacturer = await prisma.flooringManufacturer.findUnique({
    where: { id: manufacturerId },
    select: { companyName: true, agentName: true },
  })

  return manufacturer?.companyName ?? manufacturer?.agentName ?? null
}

async function resolveCategoryName(categoryId: string) {
  const category = await prisma.flooringCategory.findUnique({
    where: { id: categoryId },
    select: { name: true },
  })

  if (!category) {
    throw createAppError("Selected category was not found", {
      field: "categoryId",
      status: 400,
    })
  }

  return category.name
}

export async function createProduct(input: CreateProductInput) {
  const [manufacturerName, categoryName] = await Promise.all([
    resolveManufacturerName(input.manufacturerId),
    resolveCategoryName(input.categoryId),
  ])
  const product = await prisma.flooringProduct.create({
    data: {
      name: buildStoredProductName({
        categoryName,
        style: input.style,
        color: input.color,
      }),
      categoryId: input.categoryId,
      manufacturerId: input.manufacturerId,
      manufacturerName,
      style: input.style,
      color: input.color,
      width: input.width,
      sheetSize: input.sheetSize,
      thickness: input.thickness,
      unitWeight: input.unitWeight,
      baseColor: input.baseColor,
      coveragePerUnit: input.coveragePerUnit,
      photoUrls: input.photoUrls,
      notes: input.notes,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          ...flooringCategoryUnitInclude,
        },
      },
      manufacturer: {
        select: {
          id: true,
          agentName: true,
          companyName: true,
          website: true,
        },
      },
    },
  })

  return normalizeCatalogProduct(product)
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await prisma.flooringProduct.findUniqueOrThrow({
    where: { id },
    select: {
      categoryId: true,
      category: {
        select: { name: true },
      },
      manufacturerName: true,
      style: true,
      color: true,
    },
  })

  const nextCategoryId = input.categoryId ?? existing.categoryId

  const [manufacturerName, categoryName] = await Promise.all([
    "manufacturerId" in input ? resolveManufacturerName(input.manufacturerId) : Promise.resolve(existing.manufacturerName),
    nextCategoryId === existing.categoryId
      ? Promise.resolve(existing.category.name)
      : resolveCategoryName(nextCategoryId),
  ])

  const product = await prisma.flooringProduct.update({
    where: { id },
    data: {
      categoryId: input.categoryId,
      manufacturerId: input.manufacturerId,
      manufacturerName,
      style: input.style,
      color: input.color,
      width: input.width,
      sheetSize: input.sheetSize,
      thickness: input.thickness,
      unitWeight: input.unitWeight,
      baseColor: input.baseColor,
      coveragePerUnit: input.coveragePerUnit,
      photoUrls: input.photoUrls,
      notes: input.notes,
      name: buildStoredProductName({
        categoryName,
        style: input.style ?? existing.style,
        color: input.color ?? existing.color,
      }),
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          ...flooringCategoryUnitInclude,
        },
      },
      manufacturer: {
        select: {
          id: true,
          agentName: true,
          companyName: true,
          website: true,
        },
      },
    },
  })

  return normalizeCatalogProduct(product)
}

export async function deleteProduct(id: string) {
  await prisma.$transaction(async (tx) => {
    await tx.flooringTemplateItem.deleteMany({ where: { productId: id } })
    await tx.flooringWorkOrderItem.deleteMany({ where: { productId: id } })
    await tx.flooringInventory.deleteMany({ where: { productId: id } })
    await tx.flooringProduct.delete({ where: { id } })
  })
}
