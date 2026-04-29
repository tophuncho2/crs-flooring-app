import {
  Prisma,
  countInventoriesByProductId,
  getManufacturerById,
  getProductById,
  productNameExists,
  updateProduct,
  withDatabaseTransaction,
} from "@builders/db"
import {
  ProductExecutionError,
  buildCategoryCoveragePerUnitNotAllowedMessage,
  buildCategoryCoveragePerUnitRequiredMessage,
  buildProductCoveragePerUnitChangeBlockedMessage,
  buildStoredFlooringProductName,
  categoryRequiresCoveragePerUnit,
  isProductCoveragePerUnitChangeBlocked,
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

    // Category is immutable post-create — `UpdateProductInput` omits
    // `categoryId` at the type level and the API PATCH validator rejects it on
    // the wire. The category, its name, slug, and unit-of-measure snapshots
    // stamped onto the product row at create time are all stable for this fetch.
    const categoryName = current.category.name
    const categorySlug = current.category.slug

    const nextStyle = "style" in input ? input.style : current.style || null
    const nextColor = "color" in input ? input.color : current.color || null
    const nameAffected = "style" in input || "color" in input

    const nextCoverageIsEmpty =
      "coveragePerUnit" in input
        ? input.coveragePerUnit === null
        : !current.coveragePerUnit
    if (categoryRequiresCoveragePerUnit(categorySlug) && nextCoverageIsEmpty) {
      throw new ProductExecutionError({
        code: "PRODUCT_COVERAGE_PER_UNIT_REQUIRED",
        message: buildCategoryCoveragePerUnitRequiredMessage(categoryName),
        status: 400,
        field: "coveragePerUnit",
      })
    }

    if (!categoryRequiresCoveragePerUnit(categorySlug) && !nextCoverageIsEmpty) {
      throw new ProductExecutionError({
        code: "PRODUCT_COVERAGE_PER_UNIT_NOT_ALLOWED",
        message: buildCategoryCoveragePerUnitNotAllowedMessage(categoryName),
        status: 400,
        field: "coveragePerUnit",
      })
    }

    if ("coveragePerUnit" in input) {
      const currentCoverageStr = (current.coveragePerUnit ?? "").trim()
      const rawNextCoverage = input.coveragePerUnit
      const nextCoverageStr = rawNextCoverage == null ? "" : rawNextCoverage.toString()
      if (nextCoverageStr !== currentCoverageStr) {
        const inventoryCount = await countInventoriesByProductId(id, c)
        if (
          isProductCoveragePerUnitChangeBlocked(
            { inventoryCount },
            currentCoverageStr,
            nextCoverageStr,
          )
        ) {
          throw new ProductExecutionError({
            code: "PRODUCT_COVERAGE_PER_UNIT_LOCKED",
            message: buildProductCoveragePerUnitChangeBlockedMessage({ inventoryCount }),
            status: 409,
            field: "coveragePerUnit",
          })
        }
      }
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
