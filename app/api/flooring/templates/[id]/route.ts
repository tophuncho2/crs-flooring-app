import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { deleteTemplate, updateTemplate } from "@/features/flooring/templates/mutations"
import { getTemplateById } from "@/features/flooring/templates/queries"
import { validateUpdateTemplateInput } from "@/features/flooring/templates/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    return NextResponse.json({ template: await getTemplateById(id) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const template = await updateTemplate(id, validateUpdateTemplateInput(body))
    return NextResponse.json({ template })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    await deleteTemplate(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
