import {
  createPrismaPageLoadIssue,
  getProductDetailById,
  getProductFormOptions,
  getProductStats,
  isPrismaNotFoundError,
  type CategoryRecord,
  type PrismaDetailPageResult,
  type ProductDetailRecord,
} from "@builders/db"
import type { ProductStats } from "@builders/domain"
import { withLoaderTiming } from "@/server/telemetry/loader-timing"

// ---- Create page loader ----

export type ProductCreatePageData = {
  categoryOptions: CategoryRecord[]
}

export async function getProductCreatePageData(): Promise<ProductCreatePageData> {
  return withLoaderTiming({ loader: "flooring.products.form-options" }, () => getProductFormOptions())
}

// ---- Detail page loader ----

export type ProductDetailPageData = {
  product: ProductDetailRecord
  categoryOptions: CategoryRecord[]
  stats: ProductStats
}

export async function getProductDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<ProductDetailPageData>> {
  try {
    const [product, options, stats] = await Promise.all([
      withLoaderTiming(
        { loader: "flooring.products.detail", details: { productId: id } },
        () => getProductDetailById(id),
      ),
      getProductFormOptions(),
      getProductStats(id),
    ])
    if (!product) return { ok: false, notFound: true }
    return {
      ok: true,
      data: {
        product,
        categoryOptions: options.categoryOptions,
        stats: stats ?? {
          templateItemsCount: 0,
          workOrderItemsCount: 0,
          inventoryCount: 0,
          adjustmentsCount: 0,
        },
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
