type ProductNameParts = {
  name?: string | null
  categoryName?: string | null
  style?: string | null
  color?: string | null
}

function normalizeSegment(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function joinProductNameParts(parts: Array<string | null>) {
  return parts.filter((value): value is string => Boolean(value)).join(" - ")
}

export function buildStoredFlooringProductName(product: Omit<ProductNameParts, "name">) {
  return joinProductNameParts([
    normalizeSegment(product.categoryName),
    normalizeSegment(product.style),
    normalizeSegment(product.color),
  ]) || "Flooring Product"
}

export function buildFlooringProductDisplayName(product: ProductNameParts) {
  return normalizeSegment(product.name) || buildStoredFlooringProductName(product)
}

export function buildPadProductDisplayName(product: ProductNameParts) {
  const label = buildFlooringProductDisplayName(product)
  return label === "Flooring Product" ? "Pad Product" : label
}
