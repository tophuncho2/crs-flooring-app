import { prisma } from "@builders/db"
import { normalizeManagementCompany } from "@builders/domain"
import type { CreateManagementCompanyInput, UpdateManagementCompanyInput } from "../validators"

const managementCompanySelect = {
  id: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  properties: {
    select: {
      id: true,
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      templates: {
        select: {
          id: true,
          templateTag: true,
          warehouse: {
            select: { name: true },
          },
          _count: {
            select: {
              items: true,
              serviceItems: true,
            },
          },
        },
        orderBy: { createdAt: "desc" as const },
      },
    },
    orderBy: { name: "asc" as const },
  },
} as const

export async function createManagementCompany(input: CreateManagementCompanyInput) {
  const company = await prisma.flooringManagementCompany.create({
    data: input,
    select: managementCompanySelect,
  })

  return normalizeManagementCompany(company)
}

export async function updateManagementCompany(id: string, input: UpdateManagementCompanyInput) {
  const company = await prisma.flooringManagementCompany.update({
    where: { id },
    data: input,
    select: managementCompanySelect,
  })

  return normalizeManagementCompany(company)
}

export async function deleteManagementCompany(id: string) {
  await prisma.flooringManagementCompany.delete({ where: { id } })
}
