// Pure projection from a product's send-unit snapshot fields onto the snapshot
// pair stamped on every material-item row at write time.
//
// Mirrors `buildProductUnitSnapshotsFromCategory` but for the item layer:
// products carry the canonical snapshot (stamped from category at product
// create), and items copy `sendUnit{Name,Abbrev}` forward at item write so
// reads never traverse `item → product` for unit display.
//
// Reused by template material items AND work-order material items — the
// helper is item-shape-agnostic.
//
// Input is duck-typed: any shape with `sendUnitName / sendUnitAbbrev` each
// `string | null`. The application layer fetches the product (typically via
// `getProductById`) and passes it in.

export type ItemSendUnitSnapshot = {
  sendUnitName: string | null
  sendUnitAbbrev: string | null
}

type ProductSendUnitInput = {
  sendUnitName: string | null
  sendUnitAbbrev: string | null
}

export function buildItemSendUnitSnapshotFromProduct(
  product: ProductSendUnitInput,
): ItemSendUnitSnapshot {
  return {
    sendUnitName: product.sendUnitName ?? null,
    sendUnitAbbrev: product.sendUnitAbbrev ?? null,
  }
}
