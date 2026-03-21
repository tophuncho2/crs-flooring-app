const DEFAULT_PREFIX = "TEST"
const DEFAULT_MANUFACTURER_COUNT = 5
const DEFAULT_MANAGEMENT_COMPANY_COUNT = 5
const DEFAULT_PROPERTY_COUNT = 10
const DEFAULT_WAREHOUSE_COUNT = 3
const DEFAULT_IMPORT_COUNT = 3
const PRODUCTS_PER_CATEGORY = 2
const INVENTORY_ITEMS_PER_IMPORT = 3
const TEMPLATE_ITEMS_PER_TEMPLATE = 2
const TEMPLATE_SERVICE_ITEMS_PER_TEMPLATE = 2

const CATEGORY_BLUEPRINTS = [
  {
    name: "Carpet",
    categoryCode: 100,
    unitNames: {
      send: "Roll",
      stock: "Roll",
      coverageAvailable: "Square Foot",
      itemCoverage: "Square Foot",
      service: "Square Foot",
    },
    serviceLabel: "Carpet Install",
    serviceBaseCost: "3.25",
    products: [
      {
        style: "Harbor Loop",
        color: "Driftwood",
        width: "12ft",
        sheetSize: null,
        thickness: "0.45",
        unitWeight: "68.00",
        baseColor: "Beige",
        coveragePerUnit: "120.0000",
        cost: "245.00",
      },
      {
        style: "Summit Plush",
        color: "Graphite",
        width: "12ft",
        sheetSize: null,
        thickness: "0.50",
        unitWeight: "72.00",
        baseColor: "Gray",
        coveragePerUnit: "144.0000",
        cost: "268.00",
      },
    ],
  },
  {
    name: "Plank",
    categoryCode: 110,
    unitNames: {
      send: "Box",
      stock: "Box",
      coverageAvailable: "Square Foot",
      itemCoverage: "Square Foot",
      service: "Square Foot",
    },
    serviceLabel: "Plank Install",
    serviceBaseCost: "4.10",
    products: [
      {
        style: "Oak Reserve",
        color: "Natural",
        width: "7in",
        sheetSize: null,
        thickness: "6mm",
        unitWeight: "38.00",
        baseColor: "Brown",
        coveragePerUnit: "24.5000",
        cost: "89.00",
      },
      {
        style: "Modern Grain",
        color: "Espresso",
        width: "9in",
        sheetSize: null,
        thickness: "7mm",
        unitWeight: "42.00",
        baseColor: "Dark Brown",
        coveragePerUnit: "22.0000",
        cost: "96.00",
      },
    ],
  },
  {
    name: "Vinyl",
    categoryCode: 120,
    unitNames: {
      send: "Box",
      stock: "Box",
      coverageAvailable: "Square Foot",
      itemCoverage: "Square Foot",
      service: "Square Foot",
    },
    serviceLabel: "Vinyl Install",
    serviceBaseCost: "3.75",
    products: [
      {
        style: "Studio Flex",
        color: "Ash",
        width: "7in",
        sheetSize: null,
        thickness: "5mm",
        unitWeight: "35.00",
        baseColor: "Gray",
        coveragePerUnit: "23.0000",
        cost: "78.00",
      },
      {
        style: "Metro Core",
        color: "Pecan",
        width: "9in",
        sheetSize: null,
        thickness: "6mm",
        unitWeight: "39.00",
        baseColor: "Brown",
        coveragePerUnit: "21.5000",
        cost: "84.00",
      },
    ],
  },
  {
    name: "Sheet",
    categoryCode: 130,
    unitNames: {
      send: "Roll",
      stock: "Roll",
      coverageAvailable: "Square Foot",
      itemCoverage: "Square Foot",
      service: "Square Foot",
    },
    serviceLabel: "Sheet Install",
    serviceBaseCost: "4.35",
    products: [
      {
        style: "Hospital Grade",
        color: "Cloud",
        width: "12ft",
        sheetSize: "12x50",
        thickness: "0.10",
        unitWeight: "91.00",
        baseColor: "White",
        coveragePerUnit: "600.0000",
        cost: "510.00",
      },
      {
        style: "Commercial Shield",
        color: "Slate",
        width: "12ft",
        sheetSize: "12x60",
        thickness: "0.12",
        unitWeight: "108.00",
        baseColor: "Gray",
        coveragePerUnit: "720.0000",
        cost: "592.00",
      },
    ],
  },
  {
    name: "Adhesive",
    categoryCode: 140,
    unitNames: {
      send: "Bucket",
      stock: "Bucket",
      coverageAvailable: "Square Foot",
      itemCoverage: "Square Foot",
      service: "Square Foot",
    },
    serviceLabel: "Adhesive Prep",
    serviceBaseCost: "1.35",
    products: [
      {
        style: "Bond Max",
        color: "Standard",
        width: null,
        sheetSize: null,
        thickness: null,
        unitWeight: "42.00",
        baseColor: "White",
        coveragePerUnit: "180.0000",
        cost: "64.00",
      },
      {
        style: "Rapid Set",
        color: "Premium",
        width: null,
        sheetSize: null,
        thickness: null,
        unitWeight: "48.00",
        baseColor: "Off White",
        coveragePerUnit: "220.0000",
        cost: "72.00",
      },
    ],
  },
  {
    name: "Baseboard",
    categoryCode: 150,
    unitNames: {
      send: "Piece",
      stock: "Piece",
      coverageAvailable: "Linear Foot",
      itemCoverage: "Linear Foot",
      service: "Linear Foot",
    },
    serviceLabel: "Baseboard Install",
    serviceBaseCost: "1.95",
    products: [
      {
        style: "Colonial MDF",
        color: "Primed",
        width: "4in",
        sheetSize: "12ft",
        thickness: "0.50",
        unitWeight: "9.00",
        baseColor: "White",
        coveragePerUnit: "12.0000",
        cost: "18.00",
      },
      {
        style: "Modern Square",
        color: "Primed",
        width: "5in",
        sheetSize: "12ft",
        thickness: "0.62",
        unitWeight: "11.00",
        baseColor: "White",
        coveragePerUnit: "12.0000",
        cost: "22.00",
      },
    ],
  },
]

const WAREHOUSE_BLUEPRINTS = [
  {
    label: "North Warehouse",
    addressLine: "100 Storage Park",
    phone: "555-400-0001",
    sectionName: "Receiving",
    locationCodes: ["A-01", "A-02", "A-03"],
  },
  {
    label: "Central Warehouse",
    addressLine: "200 Logistics Way",
    phone: "555-400-0002",
    sectionName: "Main Stock",
    locationCodes: ["B-01", "B-02", "B-03"],
  },
  {
    label: "South Warehouse",
    addressLine: "300 Fulfillment Rd",
    phone: "555-400-0003",
    sectionName: "Dispatch",
    locationCodes: ["C-01", "C-02", "C-03"],
  },
]

function normalizePrefix(value) {
  const trimmed = value.trim()
  return trimmed ? trimmed : DEFAULT_PREFIX
}

function padNumber(value) {
  return String(value).padStart(2, "0")
}

function buildProductName({ manufacturerName, style, color }) {
  return [manufacturerName, style, color].filter(Boolean).join(" - ") || "Flooring Product"
}

function buildReferenceTestData({
  prefix = DEFAULT_PREFIX,
  manufacturerCount = DEFAULT_MANUFACTURER_COUNT,
  managementCompanyCount = DEFAULT_MANAGEMENT_COMPANY_COUNT,
  propertyCount = DEFAULT_PROPERTY_COUNT,
  warehouseCount = DEFAULT_WAREHOUSE_COUNT,
  importCount = DEFAULT_IMPORT_COUNT,
} = {}) {
  const normalizedPrefix = normalizePrefix(prefix)
  const normalizedWarehouseCount = Math.min(warehouseCount, WAREHOUSE_BLUEPRINTS.length)
  const normalizedImportCount = Math.min(importCount, normalizedWarehouseCount)

  const manufacturers = Array.from({ length: manufacturerCount }, (_, index) => {
    const number = padNumber(index + 1)

    return {
      companyName: `${normalizedPrefix} Manufacturer ${number}`,
      agentName: `${normalizedPrefix} Agent ${number}`,
      website: `https://${normalizedPrefix.toLowerCase()}-manufacturer-${number}.example.com`,
      phone: `555-100-${String(index + 1).padStart(4, "0")}`,
      email: `manufacturer${number}@${normalizedPrefix.toLowerCase()}.example.com`,
    }
  })

  const managementCompanies = Array.from({ length: managementCompanyCount }, (_, index) => {
    const number = padNumber(index + 1)

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
    const propertyNumber = padNumber(index + 1)
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

  const unitNames = Array.from(
    new Set(
      CATEGORY_BLUEPRINTS.flatMap((category) => [
        category.unitNames.send,
        category.unitNames.stock,
        category.unitNames.coverageAvailable,
        category.unitNames.itemCoverage,
        category.unitNames.service,
      ]),
    ),
  )
  const units = unitNames.map((name) => ({ name }))

  const categories = CATEGORY_BLUEPRINTS.map((category) => ({
    name: category.name,
    categoryCode: category.categoryCode,
    unitNames: category.unitNames,
  }))

  const services = CATEGORY_BLUEPRINTS.map((category) => ({
    name: `${normalizedPrefix} ${category.serviceLabel}`,
    unitName: category.unitNames.service,
    baseCost: category.serviceBaseCost,
    notes: `Seeded ${category.name.toLowerCase()} service`,
  }))

  const products = CATEGORY_BLUEPRINTS.flatMap((category, categoryIndex) =>
    category.products.map((product, productIndex) => {
      const manufacturer = manufacturers[(categoryIndex * PRODUCTS_PER_CATEGORY + productIndex) % manufacturers.length]

      return {
        name: buildProductName({
          manufacturerName: manufacturer.companyName,
          style: product.style,
          color: product.color,
        }),
        categoryName: category.name,
        manufacturerCompanyName: manufacturer.companyName,
        style: product.style,
        color: product.color,
        width: product.width,
        sheetSize: product.sheetSize,
        thickness: product.thickness,
        unitWeight: product.unitWeight,
        baseColor: product.baseColor,
        coveragePerUnit: product.coveragePerUnit,
        cost: product.cost,
        notes: `${normalizedPrefix} seeded ${category.name.toLowerCase()} product ${padNumber(productIndex + 1)}`,
        photoUrls: [],
      }
    }),
  )

  const warehouses = WAREHOUSE_BLUEPRINTS.slice(0, normalizedWarehouseCount).map((warehouse, index) => ({
    name: `${normalizedPrefix} ${warehouse.label}`,
    address: `${warehouse.addressLine}, Columbia, SC`,
    phone: warehouse.phone,
    sectionName: `${normalizedPrefix} ${warehouse.sectionName}`,
    locations: warehouse.locationCodes.map((locationCode) => ({
      locationCode: `${normalizedPrefix}-${locationCode}`,
    })),
    order: index + 1,
  }))

  const imports = Array.from({ length: normalizedImportCount }, (_, index) => {
    const importNumber = padNumber(index + 1)
    const warehouse = warehouses[index % warehouses.length]

    return {
      tag: `${normalizedPrefix} Import ${importNumber}`,
      orderNumber: `${normalizedPrefix}-PO-${importNumber}`,
      transportType: index % 2 === 0 ? "PURCHASE_ORDER" : "RETURN",
      status: index === normalizedImportCount - 1 ? "FINAL" : "PENDING",
      warehouseName: warehouse.name,
      notes: `${normalizedPrefix} seeded import ${importNumber}`,
      items: Array.from({ length: INVENTORY_ITEMS_PER_IMPORT }, (_, itemIndex) => {
        const product = products[(index * INVENTORY_ITEMS_PER_IMPORT + itemIndex) % products.length]
        const location = warehouse.locations[itemIndex % warehouse.locations.length]

        return {
          productName: product.name,
          itemNumber: `${normalizedPrefix}-ITEM-${importNumber}-${padNumber(itemIndex + 1)}`,
          dyeLot: itemIndex % 2 === 0 ? `${normalizedPrefix}-DL-${importNumber}-${padNumber(itemIndex + 1)}` : null,
          stockCount: String(12 + index * 4 + itemIndex * 2),
          cost: String(20 + index * 5 + itemIndex * 3),
          freight: String(5 + index + itemIndex),
          notes: `${normalizedPrefix} seeded inventory row ${importNumber}-${padNumber(itemIndex + 1)}`,
          locationCode: location.locationCode,
        }
      }),
    }
  })

  const templates = properties.map((property, index) => {
    const templateNumber = padNumber(index + 1)
    const warehouse = warehouses[index % warehouses.length]
    const materialProducts = Array.from({ length: TEMPLATE_ITEMS_PER_TEMPLATE }, (_, itemIndex) => {
      return products[(index * TEMPLATE_ITEMS_PER_TEMPLATE + itemIndex) % products.length]
    })
    const templateServices = Array.from({ length: TEMPLATE_SERVICE_ITEMS_PER_TEMPLATE }, (_, itemIndex) => {
      return services[(index * TEMPLATE_SERVICE_ITEMS_PER_TEMPLATE + itemIndex) % services.length]
    })

    return {
      propertyName: property.name,
      templateTag: `${normalizedPrefix} Template ${templateNumber}`,
      warehouseName: warehouse.name,
      instructions: `${normalizedPrefix} template instructions ${templateNumber}`,
      templateNotes: `${normalizedPrefix} template notes ${templateNumber}`,
      items: materialProducts.map((product, itemIndex) => ({
        productName: product.name,
        quantity: String(1 + ((index + itemIndex) % 3)),
        unitPrice: product.cost,
        notes: `[seed:${normalizedPrefix}:template-item:${templateNumber}:${padNumber(itemIndex + 1)}]`,
      })),
      serviceItems: templateServices.map((service, itemIndex) => ({
        serviceName: service.name,
        unitName: service.unitName,
        quantity: String(1 + ((index + itemIndex) % 2)),
        unitPrice: service.baseCost,
        notes: `[seed:${normalizedPrefix}:template-service:${templateNumber}:${padNumber(itemIndex + 1)}]`,
      })),
    }
  })

  return {
    prefix: normalizedPrefix,
    manufacturers,
    managementCompanies,
    properties,
    units,
    categories,
    services,
    products,
    warehouses,
    imports,
    templates,
  }
}

async function findFirstByWhere(model, where, select = { id: true }) {
  return model.findFirst({ where, select })
}

async function createOrUpdateByWhere({
  model,
  where,
  createData,
  updateData,
  select = { id: true },
}) {
  const existing = await findFirstByWhere(model, where, { id: true })

  if (existing) {
    return model.update({
      where: { id: existing.id },
      data: updateData,
      select,
    })
  }

  return model.create({
    data: createData,
    select,
  })
}

async function seedReferenceTestData({
  prisma,
  logger = console,
  options = {},
}) {
  const data = buildReferenceTestData(options)

  const manufacturerIdsByName = new Map()
  for (const manufacturer of data.manufacturers) {
    const savedManufacturer = await prisma.flooringManufacturer.upsert({
      where: { companyName: manufacturer.companyName },
      update: {
        agentName: manufacturer.agentName,
        website: manufacturer.website,
        phone: manufacturer.phone,
        email: manufacturer.email,
      },
      create: manufacturer,
      select: {
        id: true,
        companyName: true,
      },
    })

    manufacturerIdsByName.set(savedManufacturer.companyName, savedManufacturer.id)
  }

  const managementCompanyIdsByName = new Map()
  for (const company of data.managementCompanies) {
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

  const propertyIdsByName = new Map()
  for (const property of data.properties) {
    const managementCompanyId = managementCompanyIdsByName.get(property.managementCompanyName)

    if (!managementCompanyId) {
      throw new Error(`Management company ${property.managementCompanyName} was not seeded`)
    }

    const savedProperty = await createOrUpdateByWhere({
      model: prisma.property,
      where: { name: property.name },
      createData: {
        name: property.name,
        managementCompanyId,
        streetAddress: property.streetAddress,
        city: property.city,
        state: property.state,
        postalCode: property.postalCode,
        phone: property.phone,
        email: property.email,
      },
      updateData: {
        managementCompanyId,
        streetAddress: property.streetAddress,
        city: property.city,
        state: property.state,
        postalCode: property.postalCode,
        phone: property.phone,
        email: property.email,
      },
      select: {
        id: true,
        name: true,
      },
    })

    propertyIdsByName.set(savedProperty.name, savedProperty.id)
  }

  const unitIdsByName = new Map()
  for (const unit of data.units) {
    const savedUnit = await prisma.flooringUnitOfMeasure.upsert({
      where: { name: unit.name },
      update: {},
      create: unit,
      select: {
        id: true,
        name: true,
      },
    })

    unitIdsByName.set(savedUnit.name, savedUnit.id)
  }

  const categoryIdsByName = new Map()
  for (const category of data.categories) {
    const existingCategory = await prisma.flooringCategory.findUnique({
      where: { name: category.name },
      select: {
        id: true,
        categoryCode: true,
        sendUnitId: true,
        stockUnitId: true,
        coverageAvailableUnitId: true,
        itemCoverageUnitId: true,
        serviceUnitId: true,
      },
    })

    const categoryData = {
      categoryCode: existingCategory?.categoryCode ?? category.categoryCode,
      sendUnitId: existingCategory?.sendUnitId ?? unitIdsByName.get(category.unitNames.send) ?? null,
      stockUnitId: existingCategory?.stockUnitId ?? unitIdsByName.get(category.unitNames.stock) ?? null,
      coverageAvailableUnitId:
        existingCategory?.coverageAvailableUnitId ?? unitIdsByName.get(category.unitNames.coverageAvailable) ?? null,
      itemCoverageUnitId: existingCategory?.itemCoverageUnitId ?? unitIdsByName.get(category.unitNames.itemCoverage) ?? null,
      serviceUnitId: existingCategory?.serviceUnitId ?? unitIdsByName.get(category.unitNames.service) ?? null,
    }

    const savedCategory = existingCategory
      ? await prisma.flooringCategory.update({
          where: { id: existingCategory.id },
          data: categoryData,
          select: {
            id: true,
            name: true,
          },
        })
      : await prisma.flooringCategory.create({
          data: {
            name: category.name,
            ...categoryData,
          },
          select: {
            id: true,
            name: true,
          },
        })

    categoryIdsByName.set(savedCategory.name, savedCategory.id)
  }

  const serviceMetaByName = new Map()
  for (const service of data.services) {
    const unitId = unitIdsByName.get(service.unitName)
    if (!unitId) {
      throw new Error(`Unit ${service.unitName} was not seeded`)
    }

    const savedService = await createOrUpdateByWhere({
      model: prisma.flooringService,
      where: { name: service.name },
      createData: {
        name: service.name,
        unitId,
        baseCost: service.baseCost,
        notes: service.notes,
      },
      updateData: {
        unitId,
        baseCost: service.baseCost,
        notes: service.notes,
      },
      select: {
        id: true,
        name: true,
        unitId: true,
        baseCost: true,
      },
    })

    serviceMetaByName.set(savedService.name, {
      id: savedService.id,
      unitId: savedService.unitId,
      baseCost: savedService.baseCost.toString(),
    })
  }

  const productMetaByName = new Map()
  for (const product of data.products) {
    const categoryId = categoryIdsByName.get(product.categoryName)
    const manufacturerId = manufacturerIdsByName.get(product.manufacturerCompanyName)

    if (!categoryId) {
      throw new Error(`Category ${product.categoryName} was not seeded`)
    }
    if (!manufacturerId) {
      throw new Error(`Manufacturer ${product.manufacturerCompanyName} was not seeded`)
    }

    const savedProduct = await createOrUpdateByWhere({
      model: prisma.flooringProduct,
      where: { name: product.name },
      createData: {
        name: product.name,
        categoryId,
        manufacturerId,
        manufacturerName: product.manufacturerCompanyName,
        style: product.style,
        color: product.color,
        width: product.width,
        sheetSize: product.sheetSize,
        thickness: product.thickness,
        unitWeight: product.unitWeight,
        baseColor: product.baseColor,
        coveragePerUnit: product.coveragePerUnit,
        cost: product.cost,
        photoUrls: product.photoUrls,
        notes: product.notes,
      },
      updateData: {
        categoryId,
        manufacturerId,
        manufacturerName: product.manufacturerCompanyName,
        style: product.style,
        color: product.color,
        width: product.width,
        sheetSize: product.sheetSize,
        thickness: product.thickness,
        unitWeight: product.unitWeight,
        baseColor: product.baseColor,
        coveragePerUnit: product.coveragePerUnit,
        cost: product.cost,
        photoUrls: product.photoUrls,
        notes: product.notes,
      },
      select: {
        id: true,
        name: true,
        cost: true,
      },
    })

    productMetaByName.set(savedProduct.name, {
      id: savedProduct.id,
      cost: savedProduct.cost?.toString() ?? product.cost ?? "0",
    })
  }

  const warehouseIdsByName = new Map()
  const locationIdsByWarehouseAndCode = new Map()
  let sectionCount = 0
  let locationCount = 0

  for (const warehouse of data.warehouses) {
    const savedWarehouse = await prisma.flooringWarehouse.upsert({
      where: { name: warehouse.name },
      update: {
        address: warehouse.address,
        phone: warehouse.phone,
      },
      create: {
        name: warehouse.name,
        address: warehouse.address,
        phone: warehouse.phone,
      },
      select: {
        id: true,
        name: true,
      },
    })

    warehouseIdsByName.set(savedWarehouse.name, savedWarehouse.id)

    const savedSection = await createOrUpdateByWhere({
      model: prisma.flooringSection,
      where: {
        warehouseId: savedWarehouse.id,
        name: warehouse.sectionName,
      },
      createData: {
        warehouseId: savedWarehouse.id,
        name: warehouse.sectionName,
      },
      updateData: {
        name: warehouse.sectionName,
      },
      select: {
        id: true,
      },
    })
    sectionCount += 1

    for (const location of warehouse.locations) {
      const savedLocation = await createOrUpdateByWhere({
        model: prisma.flooringLocation,
        where: {
          warehouseId: savedWarehouse.id,
          locationCode: location.locationCode,
        },
        createData: {
          warehouseId: savedWarehouse.id,
          sectionId: savedSection.id,
          locationCode: location.locationCode,
        },
        updateData: {
          sectionId: savedSection.id,
          locationCode: location.locationCode,
        },
        select: {
          id: true,
          locationCode: true,
        },
      })
      locationCount += 1
      locationIdsByWarehouseAndCode.set(`${savedWarehouse.name}::${savedLocation.locationCode}`, savedLocation.id)
    }
  }

  let inventoryCount = 0
  for (const entry of data.imports) {
    const warehouseId = warehouseIdsByName.get(entry.warehouseName)
    if (!warehouseId) {
      throw new Error(`Warehouse ${entry.warehouseName} was not seeded`)
    }

    const savedImport = await createOrUpdateByWhere({
      model: prisma.flooringImportEntry,
      where: { tag: entry.tag },
      createData: {
        tag: entry.tag,
        orderNumber: entry.orderNumber,
        transportType: entry.transportType,
        status: entry.status,
        warehouseId,
        notes: entry.notes,
      },
      updateData: {
        orderNumber: entry.orderNumber,
        transportType: entry.transportType,
        status: entry.status,
        warehouseId,
        notes: entry.notes,
      },
      select: {
        id: true,
        tag: true,
      },
    })

    for (const item of entry.items) {
      const productMeta = productMetaByName.get(item.productName)
      if (!productMeta) {
        throw new Error(`Product ${item.productName} was not seeded`)
      }

      const locationId = locationIdsByWarehouseAndCode.get(`${entry.warehouseName}::${item.locationCode}`)
      if (!locationId) {
        throw new Error(`Location ${item.locationCode} for ${entry.warehouseName} was not seeded`)
      }

      await createOrUpdateByWhere({
        model: prisma.flooringInventory,
        where: {
          importEntryId: savedImport.id,
          itemNumber: item.itemNumber,
        },
        createData: {
          importEntryId: savedImport.id,
          productId: productMeta.id,
          itemNumber: item.itemNumber,
          dyeLot: item.dyeLot,
          locationId,
          stockCount: item.stockCount,
          cost: item.cost,
          freight: item.freight,
          notes: item.notes,
        },
        updateData: {
          productId: productMeta.id,
          dyeLot: item.dyeLot,
          locationId,
          stockCount: item.stockCount,
          cost: item.cost,
          freight: item.freight,
          notes: item.notes,
        },
      })
      inventoryCount += 1
    }
  }

  let templateItemCount = 0
  let templateServiceItemCount = 0
  for (const template of data.templates) {
    const propertyId = propertyIdsByName.get(template.propertyName)
    const warehouseId = warehouseIdsByName.get(template.warehouseName)
    if (!propertyId) {
      throw new Error(`Property ${template.propertyName} was not seeded`)
    }
    if (!warehouseId) {
      throw new Error(`Warehouse ${template.warehouseName} was not seeded`)
    }

    const savedTemplate = await createOrUpdateByWhere({
      model: prisma.flooringTemplate,
      where: {
        propertyId,
        templateTag: template.templateTag,
      },
      createData: {
        propertyId,
        templateTag: template.templateTag,
        warehouseId,
        instructions: template.instructions,
        templateNotes: template.templateNotes,
        padProductId: null,
      },
      updateData: {
        warehouseId,
        instructions: template.instructions,
        templateNotes: template.templateNotes,
        padProductId: null,
      },
      select: {
        id: true,
      },
    })

    for (const item of template.items) {
      const productMeta = productMetaByName.get(item.productName)
      if (!productMeta) {
        throw new Error(`Template product ${item.productName} was not seeded`)
      }

      await createOrUpdateByWhere({
        model: prisma.flooringTemplateItem,
        where: {
          templateId: savedTemplate.id,
          notes: item.notes,
        },
        createData: {
          templateId: savedTemplate.id,
          productId: productMeta.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? productMeta.cost ?? "0",
          notes: item.notes,
        },
        updateData: {
          productId: productMeta.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? productMeta.cost ?? "0",
          notes: item.notes,
        },
      })
      templateItemCount += 1
    }

    for (const serviceItem of template.serviceItems) {
      const serviceMeta = serviceMetaByName.get(serviceItem.serviceName)
      const unitId = unitIdsByName.get(serviceItem.unitName)
      if (!serviceMeta) {
        throw new Error(`Template service ${serviceItem.serviceName} was not seeded`)
      }
      if (!unitId) {
        throw new Error(`Template service unit ${serviceItem.unitName} was not seeded`)
      }

      await createOrUpdateByWhere({
        model: prisma.flooringTemplateServiceItem,
        where: {
          templateId: savedTemplate.id,
          notes: serviceItem.notes,
        },
        createData: {
          templateId: savedTemplate.id,
          serviceId: serviceMeta.id,
          name: serviceItem.serviceName,
          unitId,
          quantity: serviceItem.quantity,
          unitPrice: serviceItem.unitPrice ?? serviceMeta.baseCost,
          notes: serviceItem.notes,
        },
        updateData: {
          serviceId: serviceMeta.id,
          name: serviceItem.serviceName,
          unitId,
          quantity: serviceItem.quantity,
          unitPrice: serviceItem.unitPrice ?? serviceMeta.baseCost,
          notes: serviceItem.notes,
        },
      })
      templateServiceItemCount += 1
    }
  }

  const summary = {
    prefix: data.prefix,
    manufacturers: data.manufacturers.length,
    managementCompanies: data.managementCompanies.length,
    properties: data.properties.length,
    units: data.units.length,
    categories: data.categories.length,
    services: data.services.length,
    products: data.products.length,
    warehouses: data.warehouses.length,
    sections: sectionCount,
    locations: locationCount,
    imports: data.imports.length,
    inventories: inventoryCount,
    templates: data.templates.length,
    templateItems: templateItemCount,
    templateServiceItems: templateServiceItemCount,
  }

  logger.log(
    `Seeded flooring test data for prefix ${summary.prefix}: ${summary.manufacturers} manufacturers, ${summary.managementCompanies} management companies, ${summary.properties} properties, ${summary.units} units, ${summary.categories} categories, ${summary.services} services, ${summary.products} products, ${summary.warehouses} warehouses, ${summary.sections} sections, ${summary.locations} locations, ${summary.imports} imports, ${summary.inventories} inventory rows, ${summary.templates} templates, ${summary.templateItems} template items, ${summary.templateServiceItems} template service items.`,
  )

  return summary
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
  DEFAULT_WAREHOUSE_COUNT,
  DEFAULT_IMPORT_COUNT,
  PRODUCTS_PER_CATEGORY,
  INVENTORY_ITEMS_PER_IMPORT,
  TEMPLATE_ITEMS_PER_TEMPLATE,
  TEMPLATE_SERVICE_ITEMS_PER_TEMPLATE,
  CATEGORY_BLUEPRINTS,
  WAREHOUSE_BLUEPRINTS,
  buildReferenceTestData,
  seedReferenceTestData,
}
