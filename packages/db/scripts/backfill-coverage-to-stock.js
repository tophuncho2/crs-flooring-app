/**
 * One-off backfill: collapse the 4 coverage-bearing categories (Plank,
 * Carpet Tile, Covebase, Pad) onto a 1:1 stock=send structure.
 *
 * Today these categories count stock in boxes/rolls and bridge to the send
 * unit (sqft/sqyd/lf) via `coveragePerUnit`. We re-express every stock-
 * denominated value into the (former) coverage unit by multiplying through
 * `coveragePerUnit`, then set `coveragePerUnit = 1`. The current coverage
 * balance becomes the new stock balance; the send unit is unchanged (it
 * already equals the coverage unit). No rows are deleted.
 *
 *   coverage = stock * coveragePerUnit   (verified: domain conversions.ts)
 *   new stock value = old stock value * EFFMULT   ( = old coverage when cpu>0 )
 *
 * EFFMULT = CASE WHEN coveragePerUnit > 0 THEN coveragePerUnit ELSE 1 END.
 * Rows with a valid coveragePerUnit (> 0) are value-converted. Rows whose
 * coveragePerUnit is 0/NULL/negative carry no valid coverage (the domain
 * treats cpu <= 0 as "no coverage"), so they are RELABELED only: the numeric
 * stock value is kept, the stock label is swapped to the coverage unit, and
 * coveragePerUnit is set to 1. Either way the row ends 1:1.
 *
 * Dry-run by default (counts + anomaly check only). Pass --apply to convert.
 *
 *   npm run db:backfill:coverage-stock              # dry-run
 *   npm run db:backfill:coverage-stock -- --apply   # convert (one transaction)
 *
 * Idempotent: each statement only touches rows whose stock label has not yet
 * been swapped to the coverage label, so a second --apply reports 0 rows.
 *
 * The only blocking anomaly is a row with NO coverage label to relabel TO
 * (itemCoverageUnitAbbrev IS NULL) — we refuse to --apply while any exist.
 */

const COVERAGE_SLUGS = ["vinyl-plank", "carpet-tile", "covebase", "pad"]

async function countAnomalies(prisma) {
  const inv = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n FROM "flooring_inventory"
    WHERE "categorySlug" = ANY(${COVERAGE_SLUGS})
      AND "stockUnitAbbrev" IS DISTINCT FROM "itemCoverageUnitAbbrev"
      AND "itemCoverageUnitAbbrev" IS NULL
  `
  const adj = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n FROM "flooring_inventory_adjustment"
    WHERE "categorySlug" = ANY(${COVERAGE_SLUGS})
      AND "stockUnitAbbrev" IS DISTINCT FROM "itemCoverageUnitAbbrev"
      AND "itemCoverageUnitAbbrev" IS NULL
  `
  const prod = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n FROM "flooring_product" p
    WHERE p."categoryId" IN (SELECT "id" FROM "flooring_category" WHERE "slug" = ANY(${COVERAGE_SLUGS}))
      AND p."stockUnitAbbrev" IS DISTINCT FROM p."itemCoverageUnitAbbrev"
      AND p."itemCoverageUnitAbbrev" IS NULL
  `
  return { inventory: inv[0].n, adjustments: adj[0].n, products: prod[0].n }
}

// Count rows each statement would touch (mirrors the UPDATE WHEREs).
async function countPlan(prisma) {
  const q = {}
  q.adjustments = (
    await prisma.$queryRaw`
      SELECT COUNT(*)::int AS n FROM "flooring_inventory_adjustment" adj
      JOIN "flooring_inventory" inv ON adj."inventoryId" = inv."id"
      WHERE adj."categorySlug" = ANY(${COVERAGE_SLUGS})
        AND adj."itemCoverageUnitAbbrev" IS NOT NULL
        AND adj."stockUnitAbbrev" IS DISTINCT FROM adj."itemCoverageUnitAbbrev"
    `
  )[0].n
  q.inventory = (
    await prisma.$queryRaw`
      SELECT COUNT(*)::int AS n FROM "flooring_inventory"
      WHERE "categorySlug" = ANY(${COVERAGE_SLUGS})
        AND "itemCoverageUnitAbbrev" IS NOT NULL
        AND "stockUnitAbbrev" IS DISTINCT FROM "itemCoverageUnitAbbrev"
    `
  )[0].n
  q["staged inventory rows"] = (
    await prisma.$queryRaw`
      SELECT COUNT(*)::int AS n FROM "flooring_import_staged_inventory_row" r
      JOIN "flooring_product" p ON r."productId" = p."id"
      WHERE p."categoryId" IN (SELECT "id" FROM "flooring_category" WHERE "slug" = ANY(${COVERAGE_SLUGS}))
        AND p."itemCoverageUnitAbbrev" IS NOT NULL
        AND r."stockUnitAbbrev" IS DISTINCT FROM p."itemCoverageUnitAbbrev"
    `
  )[0].n
  q["staged filter rows"] = (
    await prisma.$queryRaw`
      SELECT COUNT(*)::int AS n FROM "flooring_import_staged_inventory_filter_row" r
      JOIN "flooring_product" p ON r."productId" = p."id"
      WHERE p."categoryId" IN (SELECT "id" FROM "flooring_category" WHERE "slug" = ANY(${COVERAGE_SLUGS}))
        AND p."itemCoverageUnitAbbrev" IS NOT NULL
        AND r."stockUnitAbbrev" IS DISTINCT FROM p."itemCoverageUnitAbbrev"
    `
  )[0].n
  q.products = (
    await prisma.$queryRaw`
      SELECT COUNT(*)::int AS n FROM "flooring_product" p
      WHERE p."categoryId" IN (SELECT "id" FROM "flooring_category" WHERE "slug" = ANY(${COVERAGE_SLUGS}))
        AND p."itemCoverageUnitAbbrev" IS NOT NULL
        AND p."stockUnitAbbrev" IS DISTINCT FROM p."itemCoverageUnitAbbrev"
    `
  )[0].n
  return q
}

async function backfillCoverageToStock({ prisma, apply = false, logger = console }) {
  logger.log(`Categories: ${COVERAGE_SLUGS.join(", ")}`)
  logger.log(`Mode: ${apply ? "APPLY (will convert)" : "DRY-RUN (counts only)"}`)
  logger.log("")

  const anomalies = await countAnomalies(prisma)
  const anomalyTotal = anomalies.inventory + anomalies.adjustments + anomalies.products
  logger.log("Anomalies (would-convert rows with NO coverage label to relabel to):")
  logger.log(`  ${"inventory".padEnd(24)} ${anomalies.inventory}`)
  logger.log(`  ${"adjustments".padEnd(24)} ${anomalies.adjustments}`)
  logger.log(`  ${"products".padEnd(24)} ${anomalies.products}`)
  logger.log("")

  const plan = await countPlan(prisma)
  let total = 0
  logger.log("Rows to convert/relabel:")
  for (const [label, n] of Object.entries(plan)) {
    total += n
    logger.log(`  ${label.padEnd(24)} ${n}`)
  }
  logger.log(`  ${"TOTAL".padEnd(24)} ${total}`)
  logger.log("")

  if (!apply) {
    logger.log("Dry-run only. Re-run with --apply to convert these rows.")
    return { plan, anomalies, converted: null }
  }

  if (anomalyTotal > 0) {
    throw new Error(
      `Refusing to apply: ${anomalyTotal} row(s) in the target categories have NULL ` +
        `itemCoverageUnitAbbrev (no coverage label to relabel to). Resolve these first.`,
    )
  }

  if (total === 0) {
    logger.log("Nothing to convert.")
    return { plan, anomalies, converted: {} }
  }

  const converted = {}
  await prisma.$transaction(
    async (tx) => {
      // EFFMULT: cpu when > 0 (value-convert), else 1 (relabel-only, keep value).
      // 1. Adjustments — multiply by the PARENT inventory's effective multiplier
      //    (the same cpu that produced `coverage` at creation). Run BEFORE
      //    inventory, which resets cpu to 1. RHS reads pre-update column values,
      //    so `coverage` = old quantity * effmult = new quantity.
      converted.adjustments = await tx.$executeRaw`
        UPDATE "flooring_inventory_adjustment" adj
        SET "quantity"        = adj."quantity" * (CASE WHEN inv."coveragePerUnit" > 0 THEN inv."coveragePerUnit" ELSE 1 END),
            "before"          = adj."before"   * (CASE WHEN inv."coveragePerUnit" > 0 THEN inv."coveragePerUnit" ELSE 1 END),
            "after"           = adj."after"    * (CASE WHEN inv."coveragePerUnit" > 0 THEN inv."coveragePerUnit" ELSE 1 END),
            "coverage"        = adj."quantity" * (CASE WHEN inv."coveragePerUnit" > 0 THEN inv."coveragePerUnit" ELSE 1 END),
            "stockUnitName"   = adj."itemCoverageUnitName",
            "stockUnitAbbrev" = adj."itemCoverageUnitAbbrev"
        FROM "flooring_inventory" inv
        WHERE adj."inventoryId" = inv."id"
          AND adj."categorySlug" = ANY(${COVERAGE_SLUGS})
          AND adj."itemCoverageUnitAbbrev" IS NOT NULL
          AND adj."stockUnitAbbrev" IS DISTINCT FROM adj."itemCoverageUnitAbbrev"
      `

      // 2. Inventory — re-express startingStock/netDeducted, relabel stock unit,
      //    then collapse coveragePerUnit to 1.
      converted.inventory = await tx.$executeRaw`
        UPDATE "flooring_inventory"
        SET "startingStock"   = "startingStock" * (CASE WHEN "coveragePerUnit" > 0 THEN "coveragePerUnit" ELSE 1 END),
            "netDeducted"     = "netDeducted"   * (CASE WHEN "coveragePerUnit" > 0 THEN "coveragePerUnit" ELSE 1 END),
            "stockUnitName"   = "itemCoverageUnitName",
            "stockUnitAbbrev" = "itemCoverageUnitAbbrev",
            "coveragePerUnit" = 1
        WHERE "categorySlug" = ANY(${COVERAGE_SLUGS})
          AND "itemCoverageUnitAbbrev" IS NOT NULL
          AND "stockUnitAbbrev" IS DISTINCT FROM "itemCoverageUnitAbbrev"
      `

      // 3. Staged inventory rows — multiply by the product's effective multiplier.
      //    Run BEFORE products (which resets cpu to 1).
      converted["staged inventory rows"] = await tx.$executeRaw`
        UPDATE "flooring_import_staged_inventory_row" r
        SET "startingStock"   = r."startingStock" * (CASE WHEN p."coveragePerUnit" > 0 THEN p."coveragePerUnit" ELSE 1 END),
            "stockUnitName"   = p."itemCoverageUnitName",
            "stockUnitAbbrev" = p."itemCoverageUnitAbbrev"
        FROM "flooring_product" p
        WHERE r."productId" = p."id"
          AND p."categoryId" IN (SELECT "id" FROM "flooring_category" WHERE "slug" = ANY(${COVERAGE_SLUGS}))
          AND p."itemCoverageUnitAbbrev" IS NOT NULL
          AND r."stockUnitAbbrev" IS DISTINCT FROM p."itemCoverageUnitAbbrev"
      `

      // 4. Staged filter rows — same, on stockOrdered.
      converted["staged filter rows"] = await tx.$executeRaw`
        UPDATE "flooring_import_staged_inventory_filter_row" r
        SET "stockOrdered"    = r."stockOrdered" * (CASE WHEN p."coveragePerUnit" > 0 THEN p."coveragePerUnit" ELSE 1 END),
            "stockUnitName"   = p."itemCoverageUnitName",
            "stockUnitAbbrev" = p."itemCoverageUnitAbbrev"
        FROM "flooring_product" p
        WHERE r."productId" = p."id"
          AND p."categoryId" IN (SELECT "id" FROM "flooring_category" WHERE "slug" = ANY(${COVERAGE_SLUGS}))
          AND p."itemCoverageUnitAbbrev" IS NOT NULL
          AND r."stockUnitAbbrev" IS DISTINCT FROM p."itemCoverageUnitAbbrev"
      `

      // 5. Products — collapse coveragePerUnit to 1 and relabel stock unit.
      //    Template for future inventory; must match the converted category.
      converted.products = await tx.$executeRaw`
        UPDATE "flooring_product" p
        SET "stockUnitName"   = p."itemCoverageUnitName",
            "stockUnitAbbrev" = p."itemCoverageUnitAbbrev",
            "coveragePerUnit" = 1
        WHERE p."categoryId" IN (SELECT "id" FROM "flooring_category" WHERE "slug" = ANY(${COVERAGE_SLUGS}))
          AND p."itemCoverageUnitAbbrev" IS NOT NULL
          AND p."stockUnitAbbrev" IS DISTINCT FROM p."itemCoverageUnitAbbrev"
      `

      for (const [label, n] of Object.entries(converted)) {
        logger.log(`  converted ${n} ${label}`)
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  )
  logger.log("")
  logger.log("Done.")
  return { plan, anomalies, converted }
}

async function main() {
  const apply = process.argv.includes("--apply")
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await backfillCoverageToStock({ prisma, apply })
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
  backfillCoverageToStock,
}
