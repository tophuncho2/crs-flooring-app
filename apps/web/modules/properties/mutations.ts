import { prisma } from "@builders/db"
import { normalizeProperty } from "./services"
import type { CreatePropertyInput, UpdatePropertyInput } from "./validators"

const propertySelect = {
  id: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  managementCompany: {
    select: { id: true, name: true },
  },
  templates: {
    select: {
      id: true,
      templateTag: true,
      warehouse: { select: { name: true } },
      _count: { select: { items: true, serviceItems: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const

export async function createProperty(input: CreatePropertyInput) {
  const property = await prisma.property.create({
    data: input,
    select: propertySelect,
  })

  return normalizeProperty(property)
}

export async function updateProperty(id: string, input: UpdatePropertyInput) {
  const property = await prisma.property.update({
    where: { id },
    data: input,
    select: propertySelect,
  })

  return normalizeProperty(property)
}

export async function deleteProperty(id: string) {
  await prisma.property.delete({ where: { id } })
}
