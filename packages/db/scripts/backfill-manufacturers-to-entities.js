/**
 * Entity Payments backfill — manufacturers → entities.
 *
 * One-shot, idempotent data migration run MANUALLY per environment AFTER the
 * additive `entityId` columns land (migration
 * 20260628150000_add_entity_id_to_products_imports) and BEFORE the manufacturers
 * rip-out. It:
 *
 *   1. Finds-or-creates a single "Manufacturer" FlooringEntityType.
 *   2. For each FlooringManufacturer, finds-or-creates an Entity named after the
 *      manufacturer's companyName (carrying phone/email), and ensures it carries
 *      the Manufacturer entity-type link. Builds a manufacturerId → entityId map.
 *   3. Backfills FlooringProduct.entityId and FlooringImportEntry.entityId from
 *      that map, only where manufacturerId is set and entityId is still null.
 *
 * Re-runnable: every step is find-or-create / null-guarded, so a second run is a
 * no-op. The manufacturers model is left fully intact — this script only POPULATES
 * the new entity links; the column/table drop is a separate, later migration.
 *
 * Run:  cd packages/db && npm run db:backfill:manufacturers-to-entities
 */

const SYSTEM_ACTOR = "system@backfill"
const MANUFACTURER_TYPE_LABEL = "Manufacturer"
const MANUFACTURER_TYPE_COLOR = "BLUE"

// Digits-only phone, matching the app's normalizePhoneNumber boundary contract.
function normalizePhone(value) {
  if (!value) return null
  const digits = String(value).replace(/\D/g, "")
  return digits.length > 0 ? digits : null
}

function emptyToNull(value) {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

async function findOrCreateManufacturerType(tx) {
  const existing = await tx.flooringEntityType.findFirst({
    where: { type: MANUFACTURER_TYPE_LABEL },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await tx.flooringEntityType.create({
    data: {
      type: MANUFACTURER_TYPE_LABEL,
      color: MANUFACTURER_TYPE_COLOR,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    },
    select: { id: true },
  })
  return created.id
}

// Find-or-create the entity for a manufacturer, keyed on the company name, and
// ensure the Manufacturer type link exists. Returns the entity id.
async function resolveEntityForManufacturer(tx, manufacturer, manufacturerTypeId, counters) {
  const name = emptyToNull(manufacturer.companyName) ?? `Manufacturer ${manufacturer.id}`

  let entity = await tx.entity.findFirst({
    where: { entity: name },
    select: { id: true },
  })

  if (entity) {
    counters.entitiesReused += 1
  } else {
    entity = await tx.entity.create({
      data: {
        entity: name,
        phone: normalizePhone(manufacturer.phone),
        email: emptyToNull(manufacturer.email),
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      },
      select: { id: true },
    })
    counters.entitiesCreated += 1
  }

  // Idempotent type link — the (entityId, entityTypeId) unique makes this a no-op
  // on re-run and across entities reused from a prior import.
  const link = await tx.entityEntityType.findUnique({
    where: { entityId_entityTypeId: { entityId: entity.id, entityTypeId: manufacturerTypeId } },
    select: { id: true },
  })
  if (!link) {
    await tx.entityEntityType.create({
      data: { entityId: entity.id, entityTypeId: manufacturerTypeId },
    })
  }

  return entity.id
}

async function backfillManufacturersToEntities({ prisma, logger = console }) {
  const counters = {
    manufacturers: 0,
    entitiesCreated: 0,
    entitiesReused: 0,
    productsLinked: 0,
    importsLinked: 0,
  }

  await prisma.$transaction(async (tx) => {
    const manufacturerTypeId = await findOrCreateManufacturerType(tx)

    const manufacturers = await tx.flooringManufacturer.findMany({
      select: { id: true, companyName: true, phone: true, email: true },
    })
    counters.manufacturers = manufacturers.length

    for (const manufacturer of manufacturers) {
      const entityId = await resolveEntityForManufacturer(
        tx,
        manufacturer,
        manufacturerTypeId,
        counters,
      )

      // Only fill rows that still point at the manufacturer but have no entity —
      // never overwrite an entity link a user may have already set.
      const products = await tx.flooringProduct.updateMany({
        where: { manufacturerId: manufacturer.id, entityId: null },
        data: { entityId },
      })
      counters.productsLinked += products.count

      const imports = await tx.flooringImportEntry.updateMany({
        where: { manufacturerId: manufacturer.id, entityId: null },
        data: { entityId },
      })
      counters.importsLinked += imports.count
    }
  })

  logger.log(
    `Backfill complete: ${counters.manufacturers} manufacturers → ` +
      `${counters.entitiesCreated} entities created, ${counters.entitiesReused} reused; ` +
      `${counters.productsLinked} products + ${counters.importsLinked} imports linked.`,
  )
}

async function main() {
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await backfillManufacturersToEntities({ prisma })
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

module.exports = { backfillManufacturersToEntities }
