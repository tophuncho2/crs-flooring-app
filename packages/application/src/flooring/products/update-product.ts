import {
  Prisma,
  getManufacturerById,
  getProductById,
  productNameExists,
  updateProduct,
  withDatabaseTransaction,
} from "@builders/db"
import {
  ProductExecutionError,
  buildStoredFlooringProductName,
} from "@builders/domain"
import { isP2002 } from "../../shared/prisma-errors.js"
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

    // Category is immutable post-create — `UpdateProductInput` omits
    // `categoryId` at the type level and the API PATCH validator rejects it on
    // the wire. The category, its name, slug, and unit-of-measure snapshots
    // stamped onto the product row at create time are all stable for this fetch.
    const categoryName = current.category.name

    const nextStyle = "style" in input ? input.style : current.style || null
    const nextColor = "color" in input ? input.color : current.color || null
    const nextProductNamingAddon =
      "productNamingAddon" in input
        ? input.productNamingAddon
        : current.productNamingAddon || null
    const nameAffected =
      "style" in input || "color" in input || "productNamingAddon" in input

    if ("manufacturerId" in input) {
      const nextManufacturerId = input.manufacturerId
      if (nextManufacturerId !== null && nextManufacturerId !== undefined) {
        const manufacturer = await getManufacturerById(nextManufacturerId, c)
        if (!manufacturer) {
          throw new ProductExecutionError({
            code: "PRODUCT_MANUFACTURER_NOT_FOUND",
            message: "Selected manufacturer was not found",
            status: 400,
            field: "manufacturerId",
          })
        }
      }
    }

    const patch: Parameters<typeof updateProduct>[1] = { updatedBy: actorEmail }
    if ("manufacturerId" in input) patch.manufacturerId = input.manufacturerId
    if ("style" in input) patch.style = input.style
    if ("color" in input) patch.color = input.color
    if ("coveragePerUnit" in input) patch.coveragePerUnit = input.coveragePerUnit
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
