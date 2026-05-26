const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")

/**
 * Reusable CSV seeder for the `property_hub` table (Property model).
 *
 * Rules (match the system + the user's requirements):
 *  - `name` is required; rows with a blank name are skipped and reported.
 *  - Match an existing property by name, case-insensitive + trimmed.
 *  - On match: UPDATE only the non-blank columns from the CSV (a blank cell
 *    never overwrites existing data; `name` itself is left as stored).
 *  - On no match: INSERT with name + non-blank columns.
 *  - Never deletes. Idempotent: a clean re-run creates 0.
 *  - Values are stored as-is (trimmed only) — no casing/format changes, mirroring
 *    the create-property use case which applies no normalization.
 *
 * Default CSV: packages/db/seeds/properties.csv. Override with `--file <path>`
 * (or a positional path). `--dry-run` reports planned actions without writing.
 *
 * Run: npm run db:seed:properties            (from repo root or packages/db)
 *      npm run db:seed:properties -- --dry-run
 *      npm run db:seed:properties -- --file /abs/path/to/file.csv
 */

// Non-`name` columns the seeder will write if present and non-blank in the CSV.
// Unknown CSV headers are ignored; missing headers are simply not written.
const WRITABLE_FIELDS = [
  "streetAddress",
  "city",
  "state",
  "postalCode",
  "phone",
  "email",
  "instructions",
]

const DEFAULT_CSV_PATH = resolve(__dirname, "../seeds/properties.csv")

/**
 * Minimal RFC-4180-ish CSV parser. Handles quoted fields, embedded commas,
 * escaped double-quotes (""), and CRLF/LF line endings. Returns an array of
 * string-cell arrays (including the header row).
 */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ""
  let inQuotes = false
  let i = 0

  const pushField = () => {
    row.push(field)
    field = ""
  }
  const pushRow = () => {
    rows.push(row)
    row = []
  }

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (char === ",") {
      pushField()
      i += 1
      continue
    }
    if (char === "\r") {
      i += 1
      continue
    }
    if (char === "\n") {
      pushField()
      pushRow()
      i += 1
      continue
    }
    field += char
    i += 1
  }

  // Trailing field/row when the file does not end with a newline.
  if (field.length > 0 || row.length > 0) {
    pushField()
    pushRow()
  }

  return rows
}

/**
 * Turn parsed CSV rows into trimmed `{ header: value }` records, dropping fully
 * empty lines. Each record carries `__line` (1-based source line) for reporting.
 */
function rowsToRecords(rows) {
  if (rows.length === 0) return []

  const header = rows[0].map((cell) => cell.trim())
  const records = []

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    if (cells.every((cell) => cell.trim() === "")) continue

    const record = { __line: r + 1 }
    for (let c = 0; c < header.length; c++) {
      record[header[c]] = (cells[c] ?? "").trim()
    }
    records.push(record)
  }

  return records
}

/** Build the writable data object from non-blank, non-name columns. */
function buildData(record) {
  const data = {}
  for (const field of WRITABLE_FIELDS) {
    const value = record[field]
    if (typeof value === "string" && value !== "") {
      data[field] = value
    }
  }
  return data
}

async function seedPropertiesFromCsv({ prisma, csvPath = DEFAULT_CSV_PATH, dryRun = false, logger = console }) {
  if (!existsSync(csvPath)) {
    throw new Error(`CSV not found at ${csvPath}. Pass --file <path> or place the file at packages/db/seeds/properties.csv`)
  }

  const records = rowsToRecords(parseCsv(readFileSync(csvPath, "utf8")))

  let created = 0
  let updated = 0
  let unchanged = 0
  const skipped = []
  const seen = new Set() // lowercased names created this run — keeps dry-run counts honest for in-file dupes

  const process = async (tx) => {
    for (const record of records) {
      const name = record.name ?? ""
      if (name === "") {
        skipped.push(record)
        continue
      }

      const data = buildData(record)
      const hasData = Object.keys(data).length > 0

      const existing = await tx.property.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
        select: { id: true },
      })

      if (existing) {
        if (hasData) {
          if (!dryRun) await tx.property.update({ where: { id: existing.id }, data })
          updated += 1
        } else {
          unchanged += 1
        }
        continue
      }

      // No DB row. In a real run the prior in-file insert is visible to the same
      // transaction (so `existing` above would catch it); `seen` covers dry-run.
      if (seen.has(name.toLowerCase())) {
        if (hasData) updated += 1
        else unchanged += 1
        continue
      }

      // nameNormalized carries the UNIQUE constraint; derive it the same way the
      // app does (domain normalizePropertyNameForUniqueness = name.trim().toLowerCase()).
      if (!dryRun)
        await tx.property.create({ data: { name, nameNormalized: name.trim().toLowerCase(), ...data } })
      created += 1
      seen.add(name.toLowerCase())
    }
  }

  if (dryRun) {
    await process(prisma)
  } else {
    await prisma.$transaction(process, { timeout: 120_000, maxWait: 10_000 })
  }

  logger.log(`[seed:properties] ${dryRun ? "DRY RUN — no rows written" : "done"}`)
  logger.log(`  file:        ${csvPath}`)
  logger.log(`  parsed rows: ${records.length}`)
  logger.log(`  created:     ${created}`)
  logger.log(`  updated:     ${updated}`)
  logger.log(`  unchanged:   ${unchanged} (existing rows, no non-blank cells to merge)`)
  logger.log(`  skipped:     ${skipped.length} (blank name)`)
  for (const record of skipped) {
    logger.log(`    - line ${record.__line}: ${record.email || "(no email)"}`)
  }

  return { parsed: records.length, created, updated, unchanged, skipped: skipped.length }
}

function resolveArgs(argv = process.argv.slice(2)) {
  let file = null
  let dryRun = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--dry-run") {
      dryRun = true
      continue
    }
    if (arg === "--file") {
      file = argv[i + 1] ?? null
      i += 1
      continue
    }
    if (arg.startsWith("--file=")) {
      file = arg.slice("--file=".length)
      continue
    }
    if (!arg.startsWith("--") && file === null) {
      file = arg
    }
  }

  const csvPath = file ? resolve(process.cwd(), file) : DEFAULT_CSV_PATH
  return { csvPath, dryRun }
}

async function main() {
  const { csvPath, dryRun } = resolveArgs()
  const { createPrismaClient } = await import("@builders/db")
  const prisma = createPrismaClient()

  try {
    await seedPropertiesFromCsv({ prisma, csvPath, dryRun })
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
  parseCsv,
  rowsToRecords,
  buildData,
  seedPropertiesFromCsv,
  resolveArgs,
  WRITABLE_FIELDS,
}
