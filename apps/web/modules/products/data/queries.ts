import {
  createPrismaPageLoadIssue,
  getProductDetailById,
  getProductFormOptions,
  isPrismaNotFoundError,
  listProducts,
  withPrismaConnectivityHandling,
  type CategoryRecord,
  type ManufacturerRecord,
  type PrismaDetailPageResult,
  type PrismaPageDataResult,
  type ProductDetailRecord,
  type ProductRecord,
} from "@builders/db"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"
import { listInventoryRows } from "@/modules/inventory/data/api"
import type { InventoryRow } from "@/modules/inventory/domain/types"

// ---- List page loader ----

export async function getProductsPageData(): Promise<PrismaPageDataResult<ProductRecord[]>> {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming({ loader: "flooring.products.list" }, () => listProducts()),
  )
}

// ---- Create page loader ----

export type ProductCreatePageData = {
  categoryOptions: CategoryRecord[]
  manufacturerOptions: ManufacturerRecord[]
}

export async function getProductCreatePageData(): Promise<ProductCreatePageData> {
  return withLoaderTiming({ loader: "flooring.products.form-options" }, () => getProductFormOptions())
}

// ---- Detail page loader ----

export type ProductDetailPageData = {
  product: ProductDetailRecord
  categoryOptions: CategoryRecord[]
  manufacturerOptions: ManufacturerRecord[]
  inventoryRows: InventoryRow[]
}

// Inventory module's data/api.ts still uses the pre-sweep Prisma selects and
// fails at runtime (see docs/PLAN.md § Pending — Inventory module sweep). Until
// that module lands, we degrade the detail page gracefully: log and render with
// an empty inventory section rather than 500 the whole page.
async function loadProductInventoryRowsSafely(productId: string): Promise<InventoryRow[]> {
  try {
    return await listInventoryRows(undefined, productId)
  } catch (error) {
    console.warn(
      "[flooring.products.detail] inventory fetch failed; rendering detail with empty inventory rows",
      { productId, error: error instanceof Error ? error.message : error },
    )
    return []
  }
}

export async function getProductDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<ProductDetailPageData>> {
  try {
    const [product, options, inventoryRows] = await Promise.all([
      withLoaderTiming(
        { loader: "flooring.products.detail", details: { productId: id } },
        () => getProductDetailById(id),
      ),
      getProductFormOptions(),
      loadProductInventoryRowsSafely(id),
    ])
    if (!product) return { ok: false, notFound: true }
    return {
      ok: true,
      data: {
        product,
        categoryOptions: options.categoryOptions,
        manufacturerOptions: options.manufacturerOptions,
        inventoryRows,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "PRODUCT_DETAIL_LOAD_FAILED",
        title: "Product Unavailable",
        message: "The app could not load this product.",
        detail: "The product record or its supporting options could not be loaded.",
      }),
    }
  }
}
