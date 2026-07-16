import {
  Prisma,
  entityExists,
  getCategoryById,
  getProductById,
  productNameExists,
  updateProduct,
} from "@builders/db"
import {
  ProductExecutionError,
  buildStoredFlooringProductName,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2002 } from "../shared/prisma-errors.js"
import { withTxThenEnrich } from "../shared/with-tx-then-enrich.js"
import type { ProductResult, UpdateProductInput } from "./types.js"

function productNotFound(): ProductExecutionError {
  return new ProductExecutionError({
    code: "PRODUCT_NOT_FOUND",
    message: "Product not found",
    status: 404,
  })
}

function productNameConflict(): ProductExecutionError {
  return new ProductExecutionError({
    code: "PRODUCT_NAME_CONFLICT",
    message: "Product name must be unique",
    status: 409,
    field: "name",
  })
}

export async function updateProductUseCase(
  id: string,
  input: UpdateProductInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<ProductResult> {
  assertActorEmail(actorEmail, "updateProductUseCase")

  // Current state read on the POOL, before the tx. `productRowSelect` pulls 6
  // relations (the name recompose reads category.name/style/color/addon/name), so
  // it must not run on the pinned tx connection. OCC is enforced at the route via
  // the parent product's `updatedAt` snapshot; a concurrent delete in the
  // read→write window trips the in-tx `.update` P2025 below.
  const current = await getProductById(id)
  if (!current) {
    throw productNotFound()
  }

  // The relation-free existence guards (getCategoryById/entityExists/
  // productNameExists) + the lean update run in the tx; the full multi-relation
  // record is read on the POOL after commit.
  try {
    return await withTxThenEnrich(
      async (c) => {
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
        // Conversion formula FK — independent; does not affect the stored-name recompute.
        if ("conversionFormulaId" in input) patch.conversionFormulaId = input.conversionFormulaId
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
              throw productNameConflict()
            }
            patch.name = name
          }
        }

        return updateProduct(id, patch, c)
      },
      () => getProductById(id),
      () => {
        throw productNotFound()
      },
      { client },
    )
  } catch (error) {
    if (isP2002(error, "name")) {
      throw productNameConflict()
    }
    throw error
  }
}
