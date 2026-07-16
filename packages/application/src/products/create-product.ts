import {
  Prisma,
  createProduct,
  entityExists,
  getCategoryById,
  getProductById,
  productNameExists,
} from "@builders/db"
import {
  ProductExecutionError,
  buildStoredFlooringProductName,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2002 } from "../shared/prisma-errors.js"
import { withTxThenEnrich } from "../shared/with-tx-then-enrich.js"
import type { CreateProductInput, ProductResult } from "./types.js"

function productNameConflict(): ProductExecutionError {
  return new ProductExecutionError({
    code: "PRODUCT_NAME_CONFLICT",
    message: "Product name must be unique",
    status: 409,
    field: "name",
  })
}

export async function createProductUseCase(
  input: CreateProductInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<ProductResult> {
  assertActorEmail(actorEmail, "createProductUseCase")

  // The relation-free existence guards (getCategoryById/entityExists/
  // productNameExists) + the lean insert run in the tx; the full multi-relation
  // record is read on the POOL after commit (a relation-rich read on the pinned
  // tx connection fires concurrent sub-queries and blows the tx timeout).
  try {
    return await withTxThenEnrich(
      async (c) => {
        const category = await getCategoryById(input.categoryId, c)
        if (!category) {
          throw new ProductExecutionError({
            code: "PRODUCT_CATEGORY_NOT_FOUND",
            message: "Selected category was not found",
            status: 400,
            field: "categoryId",
          })
        }

        if (input.entityId && !(await entityExists(input.entityId, c))) {
          throw new ProductExecutionError({
            code: "PRODUCT_ENTITY_NOT_FOUND",
            message: "Selected entity was not found",
            status: 400,
            field: "entityId",
          })
        }

        const name = buildStoredFlooringProductName({
          categoryName: category.name,
          style: input.style,
          color: input.color,
          productNamingAddon: input.productNamingAddon,
        })

        if (await productNameExists(name, { client: c })) {
          throw productNameConflict()
        }

        // Unit is chosen directly via the UoM FK (UoM epic 2A) — no longer derived
        // from the category. The retiring snapshot strings are left NULL on new rows
        // (the FK is authoritative); 2B flips the last cross-module readers onto it.
        return createProduct(
          {
            name,
            categoryId: input.categoryId,
            unitId: input.unitId,
            entityId: input.entityId,
            style: input.style,
            color: input.color,
            coveragePerUnit: input.coveragePerUnit,
            coverageUnitId: input.coverageUnitId,
            cost: input.cost,
            costUnitId: input.costUnitId,
            conversionFormulaId: input.conversionFormulaId,
            productNamingAddon: input.productNamingAddon,
            createdBy: actorEmail,
            updatedBy: actorEmail,
          },
          c,
        )
      },
      ({ id }) => getProductById(id),
      () => {
        throw new ProductExecutionError({
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found",
          status: 404,
        })
      },
      { client },
    )
  } catch (error) {
    // The unique constraint fires INSIDE the tx (race backstop for the pre-check).
    if (isP2002(error, "name")) {
      throw productNameConflict()
    }
    throw error
  }
}
