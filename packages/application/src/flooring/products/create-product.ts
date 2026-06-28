import {
  Prisma,
  createProduct,
  entityExists,
  getCategoryById,
  getManufacturerById,
  productNameExists,
  withDatabaseTransaction,
} from "@builders/db"
import {
  ProductExecutionError,
  buildProductUnitSnapshotsFromCategory,
  buildStoredFlooringProductName,
} from "@builders/domain"
import { isP2002 } from "../../shared/prisma-errors.js"
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

    if (input.manufacturerId) {
      const manufacturer = await getManufacturerById(input.manufacturerId, c)
      if (!manufacturer) {
        throw new ProductExecutionError({
          code: "PRODUCT_MANUFACTURER_NOT_FOUND",
          message: "Selected manufacturer was not found",
          status: 400,
          field: "manufacturerId",
        })
      }
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

    // Stamp the unit-of-measure snapshot from the chosen category onto the
    // product row. After this write, reads NEVER traverse `product → category
    // → unit_of_measure` — the snapshot lives flat on `flooring_product`.
    // Mirrors the inventory-side stamping pattern in
    // packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts.
    const snapshot = buildProductUnitSnapshotsFromCategory({
      sendUnit: category.sendUnitId
        ? { name: category.sendUnit, abbreviation: category.sendUnitAbbrev }
        : null,
      stockUnit: category.stockUnitId
        ? { name: category.stockUnit, abbreviation: category.stockUnitAbbrev }
        : null,
    })

    try {
      return await createProduct(
        {
          name,
          categoryId: input.categoryId,
          manufacturerId: input.manufacturerId,
          entityId: input.entityId,
          style: input.style,
          color: input.color,
          coveragePerUnit: input.coveragePerUnit,
          productNamingAddon: input.productNamingAddon,
          ...snapshot,
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
