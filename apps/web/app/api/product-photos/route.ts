import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { applyRoutePolicy } from "@/server/http/route-policy"
import { routeJson } from "@/server/http/route-helpers"
import { uploadFileToBucket } from "@/server/storage/s3"

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-")
}

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

function detectImageContentType(buffer: Uint8Array) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg"
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png"
  }

  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp"
  }

  return null
}

function extensionForContentType(contentType: string) {
  if (contentType === "image/jpeg") return ".jpg"
  if (contentType === "image/png") return ".png"
  if (contentType === "image/webp") return ".webp"
  return ""
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "products",
    rateLimit: {
      scope: "uploads.productPhoto",
      limit: 25,
      windowMs: 10 * 60 * 1000,
      route: "/api/product-photos",
      identifier: (context) => context.user.id,
    },
  })
  if (access instanceof Response) return access

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return routeJson(access, { error: "file is required" }, { status: 400 })
    }

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return routeJson(access, { error: "Only JPG, PNG, and WEBP uploads are allowed" }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return routeJson(access, { error: "Product photo uploads must be 10 MB or smaller" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const detectedContentType = detectImageContentType(buffer)

    if (!detectedContentType || !ALLOWED_CONTENT_TYPES.has(detectedContentType)) {
      return routeJson(access, { error: "Uploaded file is not a supported image" }, { status: 400 })
    }

    if (detectedContentType !== file.type) {
      return routeJson(access, { error: "Uploaded file type does not match the file contents" }, { status: 400 })
    }

    const originalBaseName = file.name.includes(".") ? file.name.slice(0, file.name.lastIndexOf(".")) : file.name
    const fileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(originalBaseName)}${extensionForContentType(detectedContentType)}`
    const url = await withMutationTelemetry(
      access,
      {
        message: "Product photo uploaded",
        action: "products.photo.upload",
        route: "/api/product-photos",
        entityType: "productPhoto",
        entityId: fileName,
        details: {
          contentType: detectedContentType,
          size: file.size,
        },
      },
      () => uploadFileToBucket(buffer, fileName, detectedContentType),
    )

    return routeJson(access, { url }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload product photo"
    return routeJson(access, { error: message }, { status: 500 })
  }
}
