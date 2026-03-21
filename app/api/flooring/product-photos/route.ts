import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"
import { getSessionUser } from "@/server/auth/session"
import { logEvent } from "@/server/platform/logger"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"
import { uploadFileToBucket } from "@/server/storage/s3"

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-")
}

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const clientIp = getClientIp(request)
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError
  const actor = await getSessionUser()

  if (!actor) {
    return jsonWithRequestId({ error: "Unauthorized" }, requestId, { status: 401 })
  }

  const rateLimit = await consumeRateLimit({
    request,
    scope: "uploads.productPhoto",
    identifier: actor.id,
    limit: 25,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/product-photos",
    userId: actor.id,
    userEmail: actor.email,
  })

  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit)
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return jsonWithRequestId({ error: "file is required" }, requestId, { status: 400 })
    }

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return jsonWithRequestId({ error: "Only JPG, PNG, and WEBP uploads are allowed" }, requestId, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonWithRequestId({ error: "Product photo uploads must be 10 MB or smaller" }, requestId, { status: 400 })
    }

    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""
    const fileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name.replace(extension, ""))}${extension}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadFileToBucket(buffer, fileName, file.type || "application/octet-stream")

    logEvent({
      message: "Product photo uploaded",
      action: "products.photo.upload",
      route: "/api/flooring/product-photos",
      requestId,
      userId: actor.id,
      userEmail: actor.email,
      clientIp,
      entityType: "productPhoto",
      entityId: fileName,
      details: {
        contentType: file.type,
        size: file.size,
      },
    })

    return jsonWithRequestId({ url }, requestId, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload product photo"
    logEvent({
      level: "error",
      message: "Product photo upload failed",
      action: "products.photo.upload.error",
      route: "/api/flooring/product-photos",
      requestId,
      userId: actor.id,
      userEmail: actor.email,
      clientIp,
      error,
    })
    return jsonWithRequestId({ error: message }, requestId, { status: 500 })
  }
}
