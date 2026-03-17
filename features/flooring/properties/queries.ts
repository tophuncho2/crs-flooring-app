import { prisma } from "@/server/db/prisma"
import { normalizeProperty, normalizePropertyOption } from "./services"

export async function listProperties() {
  const properties = await prisma.property.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
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
        orderBy: { createdAt: "desc" },
      },
    },
    take: 250,
  })

  return properties.map(normalizeProperty)
}

export async function listPropertyOptions() {
  const properties = await prisma.property.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
    },
  })

  return properties.map(normalizePropertyOption)
}

export async function getPropertyById(id: string) {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
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
        orderBy: { createdAt: "desc" },
      },
    },
  })

  return normalizeProperty(property)
}
