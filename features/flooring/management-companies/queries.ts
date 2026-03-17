import { prisma } from "@/server/db/prisma"
import { normalizeManagementCompany, normalizeManagementCompanyOption } from "./services"

export async function listManagementCompanies() {
  const companies = await prisma.flooringManagementCompany.findMany({
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
      properties: {
        select: {
          id: true,
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
        },
        orderBy: { name: "asc" },
      },
    },
    take: 250,
  })

  return companies.map(normalizeManagementCompany)
}

export async function listManagementCompanyOptions() {
  const companies = await prisma.flooringManagementCompany.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return companies.map(normalizeManagementCompanyOption)
}

export async function getManagementCompanyById(id: string) {
  const company = await prisma.flooringManagementCompany.findUniqueOrThrow({
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
      properties: {
        select: {
          id: true,
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
        },
        orderBy: { name: "asc" },
      },
    },
  })

  return normalizeManagementCompany(company)
}
