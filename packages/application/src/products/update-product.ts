import {
  Prisma,
  entityExists,
  getCategoryById,
  getProductById,
  productNameExists,
  updateProduct,
  withDatabaseTransaction,
} from "@builders/db"
import {
  ProductExecutionError,
  buildStoredFlooringProductName,
} from "@builders/domain"
import { isP2002 } from "../shared/prisma-errors.js"
import type { ProductResult, UpdateProductInput } from "./types.js"

export async function updateProductUseCase(
  id: string,
  input: UpdateProductInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<ProductResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("updateProductUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const current = await getProductById(id, c)
    if (!current) {
      throw new ProductExecutionError({
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
        status: 404,
      })
    }

    // Category is now MUTABLE (UoM epic 2A). The stored product name embeds the
    // category name, so a category change must recompose it — resolve the new
    // category here and feed its name into the name builder below.
    let categoryName = current.category.name
    const categoryChanged =
      "categoryId" in input &&
      input.categoryId !== undefined &&
      input.categoryId !== current.categoryId
    if (categoryChanged) {
      const category = await getCategoryById(input.categoryId as string, c)
      if (!category) {
        throw new ProductExecutionError({
          code: "PRODUCT_CATEGORY_NOT_FOUND",
          message: "Selected category was not found",
          status: 400,
          field: "categoryId",
        })
      }
      categoryName = category.name
    }

    const nextStyle = "style" in input ? input.style : current.style || null
    const nextColor = "color" in input ? input.color : current.color || null
    const nextProductNamingAddon =
      "productNamingAddon" in input
        ? input.productNamingAddon
        : current.productNamingAddon || null
    const nameAffected =
      categoryChanged ||
      "style" in input ||
      "color" in input ||
      "productNamingAddon" in input

    if ("entityId" in input) {
      const nextEntityId = input.entityId
      if (nextEntityId && !(await entityExists(nextEntityId, c))) {
        throw new ProductExecutionError({
          code: "PRODUCT_ENTITY_NOT_FOUND",
          message: "Selected entity was not found",
          status: 400,
          field: "entityId",
        })
      }
    }

    const patch: Parameters<typeof updateProduct>[1] = { updatedBy: actorEmail }
    if ("categoryId" in input) patch.categoryId = input.categoryId
    if ("unitId" in input) patch.unitId = input.unitId
    if ("entityId" in input) patch.entityId = input.entityId
    if ("style" in input) patch.style = input.style
    if ("color" in input) patch.color = input.color
    if ("coveragePerUnit" in input) patch.coveragePerUnit = input.coveragePerUnit
    // Coverage unit FK (UoM epic 1a) — independent of the main unit; does not
    // affect the stored-name recompute below.
    if ("coverageUnitId" in input) patch.coverageUnitId = input.coverageUnitId
    // Money cost + its unit — independent of each other and of the main unit;
    // neither affects the stored-name recompute below.
    if ("cost" in input) patch.cost = input.cost
    if ("costUnitId" in input) patch.costUnitId = input.costUnitId
    if ("productNamingAddon" in input) patch.productNamingAddon = input.productNamingAddon
    // Non-semantic palette tag — metadata-only passthrough. Never read here: it
    // does not affect the stored name, coverage, or any recompute.
    if ("paletteColor" in input) patch.paletteColor = input.paletteColor

    if (nameAffected) {
      const name = buildStoredFlooringProductName({
        categoryName,
        style: nextStyle,
        color: nextColor,
        productNamingAddon: nextProductNamingAddon,
      })
      if (name !== current.name) {
        if (await productNameExists(name, { excludeId: id, client: c })) {
          throw new ProductExecutionError({
            code: "PRODUCT_NAME_CONFLICT",
            message: "Product name must be unique",
            status: 409,
            field: "name",
          })
        }
        patch.name = name
      }
    }

    try {
      return await updateProduct(id, patch, c)
    } catch (error) {
      if (isP2002(error, "name")) {
        throw new ProductExecutionError({
          code: "PRODUCT_NAME_CONFLICT",
          message: "Product name must be unique",
          status: 409,
          field: "name",
        })
      }
      throw error
    }
  })
}
