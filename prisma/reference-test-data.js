const DEFAULT_PREFIX = "TEST"
const DEFAULT_MANUFACTURER_COUNT = 5
const DEFAULT_MANAGEMENT_COMPANY_COUNT = 5
const DEFAULT_PROPERTY_COUNT = 10

function normalizePrefix(value) {
  const trimmed = value.trim()
  return trimmed ? trimmed : DEFAULT_PREFIX
}

function buildReferenceTestData({
  prefix = DEFAULT_PREFIX,
  manufacturerCount = DEFAULT_MANUFACTURER_COUNT,
  managementCompanyCount = DEFAULT_MANAGEMENT_COMPANY_COUNT,
  propertyCount = DEFAULT_PROPERTY_COUNT,
} = {}) {
  const normalizedPrefix = normalizePrefix(prefix)
  const manufacturers = Array.from({ length: manufacturerCount }, (_, index) => {
    const number = String(index + 1).padStart(2, "0")

    return {
      companyName: `${normalizedPrefix} Manufacturer ${number}`,
      agentName: `${normalizedPrefix} Agent ${number}`,
      website: `https://${normalizedPrefix.toLowerCase()}-manufacturer-${number}.example.com`,
      phone: `555-100-${String(index + 1).padStart(4, "0")}`,
      email: `manufacturer${number}@${normalizedPrefix.toLowerCase()}.example.com`,
    }
  })

  const managementCompanies = Array.from({ length: managementCompanyCount }, (_, index) => {
    const number = String(index + 1).padStart(2, "0")

    return {
      name: `${normalizedPrefix} Management Company ${number}`,
      streetAddress: `${100 + index} ${normalizedPrefix} Plaza`,
      city: "Columbia",
      state: "SC",
      postalCode: `2920${index}`,
      phone: `555-200-${String(index + 1).padStart(4, "0")}`,
      email: `management${number}@${normalizedPrefix.toLowerCase()}.example.com`,
    }
  })

  const properties = Array.from({ length: propertyCount }, (_, index) => {
    const propertyNumber = String(index + 1).padStart(2, "0")
    const managementCompany = managementCompanies[index % managementCompanies.length]

    return {
      name: `${normalizedPrefix} Property ${propertyNumber}`,
      managementCompanyName: managementCompany.name,
      streetAddress: `${500 + index} ${normalizedPrefix} Lane`,
      city: "Columbia",
      state: "SC",
      postalCode: `2921${index}`,
      phone: `555-300-${String(index + 1).padStart(4, "0")}`,
      email: `property${propertyNumber}@${normalizedPrefix.toLowerCase()}.example.com`,
    }
  })

  return {
    prefix: normalizedPrefix,
    manufacturers,
    managementCompanies,
    properties,
  }
}

async function seedReferenceTestData({
  prisma,
  logger = console,
  options = {},
}) {
  const { manufacturers, managementCompanies, properties, prefix } = buildReferenceTestData(options)

  for (const manufacturer of manufacturers) {
    await prisma.flooringManufacturer.upsert({
      where: { companyName: manufacturer.companyName },
      update: {
        agentName: manufacturer.agentName,
        website: manufacturer.website,
        phone: manufacturer.phone,
        email: manufacturer.email,
      },
      create: manufacturer,
    })
  }

  const managementCompanyIdsByName = new Map()

  for (const company of managementCompanies) {
    const savedCompany = await prisma.flooringManagementCompany.upsert({
      where: { name: company.name },
      update: {
        streetAddress: company.streetAddress,
        city: company.city,
        state: company.state,
        postalCode: company.postalCode,
        phone: company.phone,
        email: company.email,
      },
      create: company,
      select: {
        id: true,
        name: true,
      },
    })

    managementCompanyIdsByName.set(savedCompany.name, savedCompany.id)
  }

  for (const property of properties) {
    const managementCompanyId = managementCompanyIdsByName.get(property.managementCompanyName)

    if (!managementCompanyId) {
      throw new Error(`Management company ${property.managementCompanyName} was not seeded`)
    }

    const existingProperty = await prisma.property.findFirst({
      where: { name: property.name },
      select: { id: true },
    })

    const propertyData = {
      managementCompanyId,
      streetAddress: property.streetAddress,
      city: property.city,
      state: property.state,
      postalCode: property.postalCode,
      phone: property.phone,
      email: property.email,
    }

    if (existingProperty) {
      await prisma.property.update({
        where: { id: existingProperty.id },
        data: propertyData,
      })
      continue
    }

    await prisma.property.create({
      data: {
        name: property.name,
        ...propertyData,
      },
    })
  }

  logger.log(
    `Seeded reference test data for prefix ${prefix}: ${manufacturers.length} manufacturers, ${managementCompanies.length} management companies, ${properties.length} properties.`,
  )

  return {
    prefix,
    manufacturers: manufacturers.length,
    managementCompanies: managementCompanies.length,
    properties: properties.length,
  }
}

async function main() {
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient()

  try {
    await seedReferenceTestData({ prisma })
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = {
  DEFAULT_PREFIX,
  DEFAULT_MANUFACTURER_COUNT,
  DEFAULT_MANAGEMENT_COMPANY_COUNT,
  DEFAULT_PROPERTY_COUNT,
  buildReferenceTestData,
  seedReferenceTestData,
}
