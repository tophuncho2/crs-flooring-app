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
}

export async function getProductDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<ProductDetailPageData>> {
  try {
    const [product, options] = await Promise.all([
      withLoaderTiming(
        { loader: "flooring.products.detail", details: { productId: id } },
        () => getProductDetailById(id),
      ),
      getProductFormOptions(),
    ])
    if (!product) return { ok: false, notFound: true }
    return {
      ok: true,
      data: {
        product,
        categoryOptions: options.categoryOptions,
        manufacturerOptions: options.manufacturerOptions,
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
