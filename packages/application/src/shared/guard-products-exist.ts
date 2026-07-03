/**
 * Batch-asserts every product id still exists, throwing a caller-supplied error
 * on the FIRST missing one (in array order). Extracted from the material-items
 * and staged-inventory section saves: each builds its own distinct-id set
 * upstream (WO filters to product-changed rows; imports unions filters + rows and
 * reuses the array for diff validation) and throws its own module ExecutionError.
 *
 * The product read is injected (mirrors `generateUniqueSlug`'s `slugExists`), so
 * callers thread their own tx or pooled client into `fetchProduct`.
 */
export async function guardProductsExist(
  productIds: string[],
  fetchProduct: (productId: string) => Promise<unknown>,
  makeError: (productId: string) => Error,
): Promise<void> {
  const products = await Promise.all(
    productIds.map(async (productId) => ({
      productId,
      product: await fetchProduct(productId),
    })),
  )
  for (const entry of products) {
    if (!entry.product) throw makeError(entry.productId)
  }
}
