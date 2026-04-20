import {
  Prisma,
  getCategoryById,
  getManufacturerById,
  getProductById,
  productNameExists,
  updateProduct,
  withDatabaseTransaction,
} from "@builders/db"
import {
  ProductExecutionError,
  buildStoredFlooringProductName,
  resolveProductManufacturerName,
} from "@builders/domain"
import { isP2002 } from "../../shared/prisma-errors.js"
import type { ProductResult, UpdateProductInput } from "./types.js"

export async function updateProductUseCase(
  id: string,
  input: UpdateProductInput,
  client?: Prisma.TransactionClient,
): Promise<ProductResult> {
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

    const nextCategoryId = input.categoryId ?? current.categoryId
    const nextStyle = "style" in input ? input.style : current.style || null
    const nextColor = "color" in input ? input.color : current.color || null
    const categoryChanged = nextCategoryId !== current.categoryId
    const nameAffected = categoryChanged || "style" in input || "color" in input

    let categoryName = current.category.name
    if (categoryChanged) {
      const category = await getCategoryById(nextCategoryId, c)
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

    let manufacturerName: string | null | undefined
    if ("manufacturerId" in input) {
      const nextManufacturerId = input.manufacturerId
      if (nextManufacturerId === null || nextManufacturerId === undefined) {
        manufacturerName = null
      } else {
        const manufacturer = await getManufacturerById(nextManufacturerId, c)
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
    }

    const patch: Parameters<typeof updateProduct>[1] = {}
    if ("categoryId" in input) patch.categoryId = input.categoryId
    if ("manufacturerId" in input) patch.manufacturerId = input.manufacturerId
    if (manufacturerName !== undefined) patch.manufacturerName = manufacturerName
    if ("style" in input) patch.style = input.style
    if ("color" in input) patch.color = input.color
    if ("width" in input) patch.width = input.width
    if ("sheetSize" in input) patch.sheetSize = input.sheetSize
    if ("thickness" in input) patch.thickness = input.thickness
    if ("unitWeight" in input) patch.unitWeight = input.unitWeight
    if ("coveragePerUnit" in input) patch.coveragePerUnit = input.coveragePerUnit
    if ("notes" in input) patch.notes = input.notes

    if (nameAffected) {
      const name = buildStoredFlooringProductName({
        categoryName,
        style: nextStyle,
        color: nextColor,
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
