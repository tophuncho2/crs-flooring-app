/**
 * One-off REPAIR: restore product `coveragePerUnit` on main after the original
 * backfill (pre-fix) wrongly collapsed it to 1.
 *
 * Context: the first run of `backfill-coverage-to-stock` against main zeroed
 * every coverage-category product's `coveragePerUnit` to 1. The fixed script no
 * longer does this, but main's values are already destroyed. dev was restored
 * from the pre-damage main dump and re-run with the FIXED script, so dev's
 * product rows hold the CORRECT original `coveragePerUnit` for the SAME product
 * ids. This script copies those values back onto main.
 *
 *   SOURCE = dev   (read-only, via SOURCE_DATABASE_URL — the pristine values)
 *   TARGET = main  (createPrismaClient() → DATABASE_URL from the loaded env)
 *
 * Writes ONLY `coveragePerUnit`, ONLY on the 4 coverage-category products,
 * ONLY rows whose target value differs from the source — matched by product id.
 * Nothing else (stock units, inventory, adjustments) is touched.
 *
 * Dry-run by default (counts + sample + anomaly check). Pass --apply to write.
 *
 *   # target=main via .env.main, source=dev via SOURCE_DATABASE_URL
 *   SOURCE_DATABASE_URL='<dev url>' DOTENV_CONFIG_PATH=../../.env.main \
 *     node -r dotenv/config scripts/repair-product-coverage-per-unit.js            # dry-run
 *   SOURCE_DATABASE_URL='<dev url>' DOTENV_CONFIG_PATH=../../.env.main \
 *     node -r dotenv/config scripts/repair-product-coverage-per-unit.js --apply    # write
 *
 * Idempotent: the UPDATE only touches rows where the value still differs, so a
 * second --apply reports 0 rows.
 *
 * Anomaly guard: the expected damaged target value is exactly 1. If any row that
 * needs repair currently holds something OTHER than 1 (i.e. main drifted since
 * the bad run), we refuse to --apply — that row needs a human, not a blind
 * overwrite.
 */

const { Client } = require("pg")

const COVERAGE_SLUGS = ["vinyl-plank", "carpet-tile", "covebase", "pad"]

// Normalize a coveragePerUnit value (text or null) for comparison.
function norm(v) {
  return v === null || v === undefined ? null : Number(v)
}

function sameValue(a, b) {
  const na = norm(a)
  const nb = norm(b)
  if (na === null || nb === null) return na === nb
  return na === nb
}

// Read (id -> coveragePerUnit::text) for coverage-category products.
async function readSource(connectionString) {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    const { rows } = await client.query(
      `SELECT p."id", p."coveragePerUnit"::text AS "coveragePerUnit"
         FROM "flooring_product" p
         JOIN "flooring_category" c ON p."categoryId" = c."id"
        WHERE c."slug" = ANY($1)`,
      [COVERAGE_SLUGS],
    )
    return rows
  } finally {
    await client.end()
  }
}

async function readTarget(prisma) {
  return prisma.$queryRaw`
    SELECT p."id", p."coveragePerUnit"::text AS "coveragePerUnit"
      FROM "flooring_product" p
      JOIN "flooring_category" c ON p."categoryId" = c."id"
     WHERE c."slug" = ANY(${COVERAGE_SLUGS})
  `
}

async function repairProductCoveragePerUnit({ prisma, sourceUrl, apply = false, logger = console }) {
  if (!sourceUrl) {
    throw new Error("SOURCE_DATABASE_URL is required (the dev DB holding the pristine coveragePerUnit values).")
  }

  logger.log(`Categories: ${COVERAGE_SLUGS.join(", ")}`)
  logger.log(`Mode: ${apply ? "APPLY (will write to TARGET)" : "DRY-RUN (read-only)"}`)
  logger.log("")

  const sourceRows = await readSource(sourceUrl)
  const targetRows = await readTarget(prisma)

  const sourceById = new Map(sourceRows.map((r) => [r.id, r.coveragePerUnit]))
  const targetById = new Map(targetRows.map((r) => [r.id, r.coveragePerUnit]))

  logger.log(`Source (dev)  coverage products: ${sourceRows.length}`)
  logger.log(`Target (main) coverage products: ${targetRows.length}`)
  logger.log("")

  const toRepair = [] // { id, from, to }
  const anomalies = [] // to-repair rows whose target value is not the expected 1
  const missingInTarget = [] // id present in source, absent in target
  let alreadyCorrect = 0

  for (const [id, srcVal] of sourceById) {
    if (!targetById.has(id)) {
      missingInTarget.push(id)
      continue
    }
    const tgtVal = targetById.get(id)
    if (sameValue(srcVal, tgtVal)) {
      alreadyCorrect += 1
      continue
    }
    toRepair.push({ id, from: tgtVal, to: srcVal })
    if (norm(tgtVal) !== 1) anomalies.push({ id, from: tgtVal, to: srcVal })
  }

  const extraInTarget = [...targetById.keys()].filter((id) => !sourceById.has(id))

  logger.log("Plan:")
  logger.log(`  ${"already correct".padEnd(24)} ${alreadyCorrect}`)
  logger.log(`  ${"to repair".padEnd(24)} ${toRepair.length}`)
  logger.log(`  ${"missing in target".padEnd(24)} ${missingInTarget.length}`)
  logger.log(`  ${"extra in target".padEnd(24)} ${extraInTarget.length}`)
  logger.log(`  ${"anomalies (target != 1)".padEnd(24)} ${anomalies.length}`)
  logger.log("")

  if (toRepair.length > 0) {
    logger.log("Sample of rows to repair (id  from -> to):")
    for (const r of toRepair.slice(0, 15)) {
      logger.log(`  ${r.id}  ${String(r.from)} -> ${String(r.to)}`)
    }
    if (toRepair.length > 15) logger.log(`  ... and ${toRepair.length - 15} more`)
    logger.log("")
  }

  if (missingInTarget.length > 0) {
    logger.log(`NOTE: ${missingInTarget.length} source product id(s) not found on target (skipped).`)
  }
  if (extraInTarget.length > 0) {
    logger.log(`NOTE: ${extraInTarget.length} target product id(s) not in source (left untouched).`)
  }
  if (anomalies.length > 0) {
    logger.log("")
    logger.log("ANOMALIES — target value is not the expected 1 (main drifted):")
    for (const a of anomalies.slice(0, 15)) {
      logger.log(`  ${a.id}  current=${String(a.from)}  source=${String(a.to)}`)
    }
    if (anomalies.length > 15) logger.log(`  ... and ${anomalies.length - 15} more`)
  }
  logger.log("")

  if (!apply) {
    logger.log("Dry-run only. Re-run with --apply to write these values to the target.")
    return { toRepair, anomalies, missingInTarget, extraInTarget, alreadyCorrect, converted: null }
  }

  if (anomalies.length > 0) {
    throw new Error(
      `Refusing to apply: ${anomalies.length} row(s) hold a target value other than 1 ` +
        `(main has drifted since the bad run). Resolve these by hand first.`,
    )
  }

  if (toRepair.length === 0) {
    logger.log("Nothing to repair.")
    return { toRepair, anomalies, missingInTarget, extraInTarget, alreadyCorrect, converted: 0 }
  }

  let converted = 0
  await prisma.$transaction(async (tx) => {
    for (const r of toRepair) {
      // Belt-and-suspenders: re-scope to coverage categories on the target and
      // only write when the value still differs (keeps it idempotent).
      const n =
        r.to === null
          ? await tx.$executeRaw`
              UPDATE "flooring_product" p
                 SET "coveragePerUnit" = NULL
               WHERE p."id" = ${r.id}
                 AND p."categoryId" IN (SELECT "id" FROM "flooring_category" WHERE "slug" = ANY(${COVERAGE_SLUGS}))
                 AND p."coveragePerUnit" IS NOT NULL
            `
          : await tx.$executeRaw`
              UPDATE "flooring_product" p
                 SET "coveragePerUnit" = CAST(${r.to} AS numeric)
               WHERE p."id" = ${r.id}
                 AND p."categoryId" IN (SELECT "id" FROM "flooring_category" WHERE "slug" = ANY(${COVERAGE_SLUGS}))
                 AND p."coveragePerUnit" IS DISTINCT FROM CAST(${r.to} AS numeric)
            `
      converted += n
    }
  })

  logger.log(`Repaired ${converted} product row(s).`)
  logger.log("")
  logger.log("Done.")
  return { toRepair, anomalies, missingInTarget, extraInTarget, alreadyCorrect, converted }
}

async function main() {
  const apply = process.argv.includes("--apply")
  const sourceUrl = process.env.SOURCE_DATABASE_URL
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await repairProductCoveragePerUnit({ prisma, sourceUrl, apply })
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
  COVERAGE_SLUGS,
  repairProductCoveragePerUnit,
  sameValue,
}
