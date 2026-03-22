import { prisma } from "@/server/db/prisma"
import { flooringCategoryUnitInclude } from "@/server/flooring/unit-measures"
import { buildProductName, normalizeCatalogProduct } from "../domain/services"
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

export async function createProduct(input: CreateProductInput) {
  const manufacturerName = await resolveManufacturerName(input.manufacturerId)
  const product = await prisma.flooringProduct.create({
    data: {
      name: buildProductName({
        manufacturerName,
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
      manufacturerName: true,
      style: true,
      color: true,
    },
  })

  const manufacturerName =
    "manufacturerId" in input ? await resolveManufacturerName(input.manufacturerId) : existing.manufacturerName

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
      name: buildProductName({
        manufacturerName,
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
