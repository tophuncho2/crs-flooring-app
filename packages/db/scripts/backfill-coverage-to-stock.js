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

// Round to the column scale (Decimal(12,2)) via integer cents to avoid float fuzz.
function round2(n) {
  return Math.round((n + (n >= 0 ? Number.EPSILON : -Number.EPSILON)) * 100) / 100
}

/**
 * Pure ledger rebuild for one inventory + its adjustments. Scales every value
 * by EFFMULT once, then REPLAYS the finalized chain in finalSequence order so
 * before/after are derived by exact 2-dp subtraction of the scaled quantity —
 * eliminating the per-row rounding drift that independent column scaling causes
 * when coveragePerUnit is fractional. netDeducted is derived from the same
 * scaled quantities so the chain endpoint ties out to (startingStock - netDeducted).
 *
 *   inv:  { startingStock, coveragePerUnit }  (numbers)
 *   adjs: [{ id, quantity, adjustmentType, isFinal, finalSequence,
 *            itemCoverageUnitName, itemCoverageUnitAbbrev }]
 * Returns { newStarting, newNetDeducted, adjustments: [{ id, newQty, before, after }] }
 * where before/after are null for non-final (pending/queued) rows.
 */
function computeInventoryConversion(inv, adjs) {
  const cpu = Number(inv.coveragePerUnit)
  const effmult = cpu > 0 ? cpu : 1
  const newStarting = round2(Number(inv.startingStock) * effmult)

  const scaled = adjs.map((a) => ({
    id: a.id,
    isFinal: a.isFinal,
    finalSequence: a.finalSequence === null ? null : Number(a.finalSequence),
    adjustmentType: a.adjustmentType,
    newQty: round2(Number(a.quantity) * effmult),
    before: null,
    after: null,
  }))

  const finals = scaled
    .filter((a) => a.isFinal && a.finalSequence !== null)
    .sort((x, y) => x.finalSequence - y.finalSequence)

  let running = newStarting
  for (const a of finals) {
    a.before = running
    const signedDelta = a.adjustmentType === "DEDUCTION" ? a.newQty : -a.newQty
    a.after = round2(running - signedDelta)
    running = a.after
  }
  const newNetDeducted = round2(newStarting - running)

  return { newStarting, newNetDeducted, adjustments: scaled }
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
      // 1 + 2. Inventory & adjustments — read each unconverted inventory with its
      //    adjustments, rebuild the ledger by replaying the finalSequence chain
      //    (exact 2-dp before/after, derived netDeducted), then write per row.
      const invRows = await tx.$queryRaw`
        SELECT "id", "startingStock"::text AS "startingStock",
               "coveragePerUnit"::text AS "coveragePerUnit",
               "itemCoverageUnitName", "itemCoverageUnitAbbrev"
        FROM "flooring_inventory"
        WHERE "categorySlug" = ANY(${COVERAGE_SLUGS})
          AND "itemCoverageUnitAbbrev" IS NOT NULL
          AND "stockUnitAbbrev" IS DISTINCT FROM "itemCoverageUnitAbbrev"
      `
      const invIds = invRows.map((r) => r.id)
      const adjRows = invIds.length
        ? await tx.$queryRaw`
            SELECT "id", "inventoryId", "quantity"::text AS "quantity",
                   "adjustmentType", "isFinal", "finalSequence",
                   "itemCoverageUnitName", "itemCoverageUnitAbbrev"
            FROM "flooring_inventory_adjustment"
            WHERE "inventoryId" = ANY(${invIds})
              AND "itemCoverageUnitAbbrev" IS NOT NULL
              AND "stockUnitAbbrev" IS DISTINCT FROM "itemCoverageUnitAbbrev"
          `
        : []
      const adjByInv = new Map()
      for (const a of adjRows) {
        if (!adjByInv.has(a.inventoryId)) adjByInv.set(a.inventoryId, [])
        adjByInv.get(a.inventoryId).push(a)
      }

      let invCount = 0
      let adjCount = 0
      for (const inv of invRows) {
        const adjs = adjByInv.get(inv.id) ?? []
        const result = computeInventoryConversion(inv, adjs)

        await tx.$executeRaw`
          UPDATE "flooring_inventory"
          SET "startingStock"   = ${result.newStarting},
              "netDeducted"     = ${result.newNetDeducted},
              "stockUnitName"   = ${inv.itemCoverageUnitName},
              "stockUnitAbbrev" = ${inv.itemCoverageUnitAbbrev},
              "coveragePerUnit" = 1
          WHERE "id" = ${inv.id}
        `
        invCount += 1

        const labelByAdj = new Map(adjs.map((a) => [a.id, a]))
        for (const a of result.adjustments) {
          const src = labelByAdj.get(a.id)
          await tx.$executeRaw`
            UPDATE "flooring_inventory_adjustment"
            SET "quantity"        = ${a.newQty},
                "coverage"        = ${a.newQty},
                "before"          = ${a.before},
                "after"           = ${a.after},
                "stockUnitName"   = ${src.itemCoverageUnitName},
                "stockUnitAbbrev" = ${src.itemCoverageUnitAbbrev}
            WHERE "id" = ${a.id}
          `
          adjCount += 1
        }
      }
      converted.inventory = invCount
      converted.adjustments = adjCount

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
  computeInventoryConversion,
  round2,
}
