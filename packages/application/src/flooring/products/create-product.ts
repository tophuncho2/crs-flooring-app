import {
  Prisma,
  createProduct,
  getCategoryById,
  getManufacturerById,
  productNameExists,
  withDatabaseTransaction,
} from "@builders/db"
import {
  ProductExecutionError,
  buildCategoryCoveragePerUnitRequiredMessage,
  buildStoredFlooringProductName,
  categoryRequiresCoveragePerUnit,
  resolveProductManufacturerName,
} from "@builders/domain"
import { isP2002 } from "../../shared/prisma-errors.js"
import type { CreateProductInput, ProductResult } from "./types.js"

export async function createProductUseCase(
  input: CreateProductInput,
  client?: Prisma.TransactionClient,
): Promise<ProductResult> {
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

    if (categoryRequiresCoveragePerUnit(category.slug) && input.coveragePerUnit === null) {
      throw new ProductExecutionError({
        code: "PRODUCT_COVERAGE_PER_UNIT_REQUIRED",
        message: buildCategoryCoveragePerUnitRequiredMessage(category.name),
        status: 400,
        field: "coveragePerUnit",
      })
    }

    let manufacturerName: string | null = null
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
      manufacturerName = resolveProductManufacturerName({
        companyName: manufacturer.companyName,
        storedManufacturerName: null,
      })
    }

    const name = buildStoredFlooringProductName({
      categoryName: category.name,
      style: input.style,
      color: input.color,
    })

    if (await productNameExists(name, { client: c })) {
      throw new ProductExecutionError({
        code: "PRODUCT_NAME_CONFLICT",
        message: "Product name must be unique",
        status: 409,
        field: "name",
      })
    }

    try {
      return await createProduct(
        {
          name,
          categoryId: input.categoryId,
          manufacturerId: input.manufacturerId,
          manufacturerName,
          style: input.style,
          color: input.color,
          width: input.width,
          sheetSize: input.sheetSize,
          thickness: input.thickness,
          unitWeight: input.unitWeight,
          coveragePerUnit: input.coveragePerUnit,
          notes: input.notes,
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
