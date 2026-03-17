import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"
import { uploadFileToBucket } from "@/server/storage/s3"

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-")
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 })
    }

    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""
    const fileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name.replace(extension, ""))}${extension}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadFileToBucket(buffer, fileName, file.type || "application/octet-stream")

    return NextResponse.json({ url }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload product photo"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
