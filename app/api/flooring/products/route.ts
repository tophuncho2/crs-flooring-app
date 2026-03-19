import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { createProduct } from "@/features/flooring/products/mutations"
import { listCatalogProducts, listProductOptions } from "@/features/flooring/products/queries"
import { validateCreateProductInput } from "@/features/flooring/products/validators"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const catalogMode = searchParams.get("catalog") === "1"
  const authError = await ensureBuilderOrAdmin({ toolSlug: catalogMode ? "products" : "warehouse" })
  if (authError) return authError

  try {
    return NextResponse.json({
      products: catalogMode
        ? await listCatalogProducts(undefined, {
            searchQuery: "",
            isAscendingSort: true,
            isGroupingEnabled: false,
            groupByKeys: [],
          })
        : await listProductOptions(),
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const product = await createProduct(validateCreateProductInput(body))
    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
