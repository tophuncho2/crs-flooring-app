import {
  Prisma,
  createProduct,
  entityExists,
  getCategoryById,
  productNameExists,
  withDatabaseTransaction,
} from "@builders/db"
import {
  ProductExecutionError,
  buildStoredFlooringProductName,
} from "@builders/domain"
import { isP2002 } from "../shared/prisma-errors.js"
import type { CreateProductInput, ProductResult } from "./types.js"

export async function createProductUseCase(
  input: CreateProductInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<ProductResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("createProductUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

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
      throw new ProductExecutionError({
        code: "PRODUCT_NAME_CONFLICT",
        message: "Product name must be unique",
        status: 409,
        field: "name",
      })
    }

    // Unit is chosen directly via the UoM FK (UoM epic 2A) — no longer derived
    // from the category. The retiring snapshot strings are left NULL on new rows
    // (the FK is authoritative); 2B flips the last cross-module readers onto it.
    try {
      return await createProduct(
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
          productNamingAddon: input.productNamingAddon,
          createdBy: actorEmail,
          updatedBy: actorEmail,
        },
        c,
      )
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
