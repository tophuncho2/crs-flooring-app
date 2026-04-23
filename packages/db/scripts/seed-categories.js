const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

/**
 * Canonical list of categories.
 * Keep in sync with packages/db/src/seed/categories.ts (the TypeScript source of truth).
 */
const SEEDED_CATEGORIES = [
  {
    slug: "vinyl-plank",
    name: "Vinyl Plank",
    sendUnitSlug: "square-feet",
    stockUnitSlug: "boxes",
    coverageAvailableUnitSlug: "square-feet",
    itemCoverageUnitSlug: "square-feet",
    serviceUnitSlug: null,
  },
  {
    slug: "carpet-tile",
    name: "Carpet Tile",
    sendUnitSlug: "square-yard",
    stockUnitSlug: "boxes",
    coverageAvailableUnitSlug: "square-yard",
    itemCoverageUnitSlug: "square-yard",
    serviceUnitSlug: null,
  },
  {
    slug: "covebase",
    name: "Covebase",
    sendUnitSlug: "linear-feet",
    stockUnitSlug: "boxes",
    coverageAvailableUnitSlug: "linear-feet",
    itemCoverageUnitSlug: "linear-feet",
    serviceUnitSlug: null,
  },
  {
    slug: "pad",
    name: "Pad",
    sendUnitSlug: "square-yard",
    stockUnitSlug: "rolls",
    coverageAvailableUnitSlug: "square-yard",
    itemCoverageUnitSlug: "square-yard",
    serviceUnitSlug: null,
  },
  {
    slug: "adhesive",
    name: "Adhesive",
    sendUnitSlug: "buckets",
    stockUnitSlug: "buckets",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "baseboard",
    name: "Baseboard",
    sendUnitSlug: "pieces",
    stockUnitSlug: "pieces",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "carpet",
    name: "Carpet",
    sendUnitSlug: "linear-feet",
    stockUnitSlug: "linear-feet",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "kilz",
    name: "Kilz",
    sendUnitSlug: "units",
    stockUnitSlug: "units",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "luan",
    name: "Luan",
    sendUnitSlug: "sheets",
    stockUnitSlug: "sheets",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "metals",
    name: "Metals",
    sendUnitSlug: "pieces",
    stockUnitSlug: "pieces",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "moisture-barrier",
    name: "Moisture Barrier",
    sendUnitSlug: "units",
    stockUnitSlug: "units",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "patch",
    name: "Patch",
    sendUnitSlug: "bags",
    stockUnitSlug: "bags",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "plywood",
    name: "Plywood",
    sendUnitSlug: "sheets",
    stockUnitSlug: "sheets",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "primer",
    name: "Primer",
    sendUnitSlug: "units",
    stockUnitSlug: "units",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "scent-stop",
    name: "Scent Stop",
    sendUnitSlug: "units",
    stockUnitSlug: "units",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "shoe-molding",
    name: "Shoe Molding",
    sendUnitSlug: "pieces",
    stockUnitSlug: "pieces",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "trim",
    name: "Trim",
    sendUnitSlug: "pieces",
    stockUnitSlug: "pieces",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "vct",
    name: "VCT",
    sendUnitSlug: "boxes",
    stockUnitSlug: "boxes",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "vinyl-sheet",
    name: "Vinyl Sheet",
    sendUnitSlug: "linear-feet",
    stockUnitSlug: "linear-feet",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
  {
    slug: "wax-ring",
    name: "Wax Ring",
    sendUnitSlug: "boxes",
    stockUnitSlug: "boxes",
    coverageAvailableUnitSlug: null,
    itemCoverageUnitSlug: null,
    serviceUnitSlug: null,
  },
]

function verifySyncWithTypeScriptSource() {
  const tsPath = resolve(__dirname, "../src/seed/categories.ts")
  const tsSource = readFileSync(tsPath, "utf8")

  const entryPattern =
    /\{\s*slug:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*sendUnitSlug:\s*(?:"([^"]+)"|null),\s*stockUnitSlug:\s*(?:"([^"]+)"|null),\s*coverageAvailableUnitSlug:\s*(?:"([^"]+)"|null),\s*itemCoverageUnitSlug:\s*(?:"([^"]+)"|null),\s*serviceUnitSlug:\s*(?:"([^"]+)"|null)\s*,?\s*\}/g
  const tsEntries = []
  let match
  while ((match = entryPattern.exec(tsSource)) !== null) {
    tsEntries.push({
      slug: match[1],
      name: match[2],
      sendUnitSlug: match[3] ?? null,
      stockUnitSlug: match[4] ?? null,
      coverageAvailableUnitSlug: match[5] ?? null,
      itemCoverageUnitSlug: match[6] ?? null,
      serviceUnitSlug: match[7] ?? null,
    })
  }

  const jsKey = (entry) =>
    `${entry.slug}|${entry.name}|${entry.sendUnitSlug}|${entry.stockUnitSlug}|${entry.coverageAvailableUnitSlug}|${entry.itemCoverageUnitSlug}|${entry.serviceUnitSlug}`
  const jsKeys = SEEDED_CATEGORIES.map(jsKey)
  const tsKeys = tsEntries.map(jsKey)

  if (jsKeys.length !== tsKeys.length) {
    throw new Error(
      `Seed sync failure: .js has ${jsKeys.length} entries, .ts has ${tsKeys.length} entries. ` +
        `Update both files to match. TS source: src/seed/categories.ts`,
    )
  }

  for (let i = 0; i < jsKeys.length; i++) {
    if (jsKeys[i] !== tsKeys[i]) {
      throw new Error(
        `Seed sync failure at index ${i}: ` +
          `.js has "${jsKeys[i]}", .ts has "${tsKeys[i]}". ` +
          `Update both files to match. TS source: src/seed/categories.ts`,
      )
    }
  }
}

function resolveUnitId(unitSlugMap, slug, fieldName, categorySlug) {
  if (slug === null) return null
  const id = unitSlugMap.get(slug)
  if (!id) {
    throw new Error(
      `Category "${categorySlug}": ${fieldName} references unit slug "${slug}" which does not exist in flooring_unit_of_measure. ` +
        `Seed unit of measures first.`,
    )
  }
  return id
}

async function seedCategories({ prisma, logger = console }) {
  verifySyncWithTypeScriptSource()

  let created = 0
  let updated = 0

  await prisma.$transaction(async (tx) => {
    const units = await tx.flooringUnitOfMeasure.findMany({
      select: { slug: true, id: true },
    })
    const unitSlugMap = new Map(units.map((u) => [u.slug, u.id]))

    for (const entry of SEEDED_CATEGORIES) {
      const sendUnitId = resolveUnitId(unitSlugMap, entry.sendUnitSlug, "sendUnitSlug", entry.slug)
      const stockUnitId = resolveUnitId(unitSlugMap, entry.stockUnitSlug, "stockUnitSlug", entry.slug)
      const coverageAvailableUnitId = resolveUnitId(unitSlugMap, entry.coverageAvailableUnitSlug, "coverageAvailableUnitSlug", entry.slug)
      const itemCoverageUnitId = resolveUnitId(unitSlugMap, entry.itemCoverageUnitSlug, "itemCoverageUnitSlug", entry.slug)
      const serviceUnitId = resolveUnitId(unitSlugMap, entry.serviceUnitSlug, "serviceUnitSlug", entry.slug)

      const existing = await tx.flooringCategory.findUnique({
        where: { slug: entry.slug },
        select: { id: true },
      })

      if (existing) {
        await tx.flooringCategory.update({
          where: { slug: entry.slug },
          data: {
            name: entry.name,
            sendUnitId,
            stockUnitId,
            coverageAvailableUnitId,
            itemCoverageUnitId,
            serviceUnitId,
          },
        })
        updated += 1
      } else {
        await tx.flooringCategory.create({
          data: {
            slug: entry.slug,
            name: entry.name,
            sendUnitId,
            stockUnitId,
            coverageAvailableUnitId,
            itemCoverageUnitId,
            serviceUnitId,
          },
        })
        created += 1
      }
    }
  })

  logger.log(`Seeded ${SEEDED_CATEGORIES.length} categories (${created} created, ${updated} already existed)`)
}

async function main() {
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient()

  try {
    await seedCategories({ prisma })
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
  SEEDED_CATEGORIES,
  seedCategories,
}
