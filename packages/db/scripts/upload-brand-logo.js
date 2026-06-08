/**
 * One-off maintenance script: upload the company brand logo to the current
 * environment's S3 bucket so the work-order print views (picking ticket + slip)
 * render the logo instead of falling back to the "CRS Floor Covering" text.
 *
 * Uploads the repo-root CRS-Logo-Transparent.png to the fixed key the print
 * views read. Idempotent: skips if the object already exists; pass --force to
 * overwrite. Runs per-branch against that branch's .env / bucket.
 *
 *   npm run upload:brand-logo            # upload if absent, else skip
 *   npm run upload:brand-logo -- --force # overwrite an existing object
 *   npm run upload:brand-logo -- --file /path/to/logo.png
 *
 * Reuses @builders/lib's storage helpers (single source of truth for the S3
 * client); requires the lib dist to be built (npm run build).
 */

const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

// Source of truth: BRAND_LOGO_KEY in apps/web/server/storage/s3.ts.
const LOGO_KEY = "assets/logo.png"
const CONTENT_TYPE = "image/png"
const DEFAULT_LOGO_PATH = resolve(__dirname, "../../../CRS-Logo-Transparent.png")

function getStorageEnv() {
  const {
    AWS_ACCESS_KEY_ID,
    AWS_DEFAULT_REGION,
    AWS_ENDPOINT_URL,
    AWS_S3_BUCKET_NAME,
    AWS_SECRET_ACCESS_KEY,
  } = process.env

  const missing = [
    ["AWS_ACCESS_KEY_ID", AWS_ACCESS_KEY_ID],
    ["AWS_DEFAULT_REGION", AWS_DEFAULT_REGION],
    ["AWS_ENDPOINT_URL", AWS_ENDPOINT_URL],
    ["AWS_S3_BUCKET_NAME", AWS_S3_BUCKET_NAME],
    ["AWS_SECRET_ACCESS_KEY", AWS_SECRET_ACCESS_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    throw new Error(`Missing required storage env vars: ${missing.join(", ")}`)
  }

  return {
    accessKeyId: AWS_ACCESS_KEY_ID,
    defaultRegion: AWS_DEFAULT_REGION,
    endpointUrl: AWS_ENDPOINT_URL,
    bucketName: AWS_S3_BUCKET_NAME,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  }
}

function resolveLogoPath(argv) {
  const flagIndex = argv.indexOf("--file")
  if (flagIndex !== -1) {
    const value = argv[flagIndex + 1]
    if (!value) throw new Error("--file requires a path argument")
    return resolve(process.cwd(), value)
  }
  return DEFAULT_LOGO_PATH
}

async function uploadBrandLogo({ env, logoPath, force = false, logger = console }) {
  const { uploadBucketObject, bucketObjectExists, buildBucketObjectUrl } = await import("@builders/lib")

  const url = buildBucketObjectUrl(env, LOGO_KEY)
  logger.log(`Bucket: ${env.bucketName}`)
  logger.log(`Key:    ${LOGO_KEY}`)
  logger.log(`Source: ${logoPath}`)
  logger.log("")

  const exists = await bucketObjectExists(env, LOGO_KEY)
  if (exists && !force) {
    logger.log(`Already present at ${url} — skipping. Re-run with --force to overwrite.`)
    return { uploaded: false, url }
  }

  const data = readFileSync(logoPath)
  logger.log(`${exists ? "Overwriting" : "Uploading"} ${data.length} bytes...`)
  await uploadBucketObject(env, { data, key: LOGO_KEY, contentType: CONTENT_TYPE })

  const confirmed = await bucketObjectExists(env, LOGO_KEY)
  if (!confirmed) {
    throw new Error(`Upload reported success but ${LOGO_KEY} was not found on re-check.`)
  }

  logger.log("")
  logger.log(`Done. Logo available at ${url}`)
  return { uploaded: true, url }
}

async function main() {
  const force = process.argv.includes("--force")
  const logoPath = resolveLogoPath(process.argv)
  const env = getStorageEnv()

  await uploadBrandLogo({ env, logoPath, force })
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = {
  LOGO_KEY,
  uploadBrandLogo,
}
