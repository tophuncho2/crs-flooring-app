export function normalizeAddressState(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
}

export function buildAddressLine(address: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [address.streetAddress, address.city, address.state, address.postalCode].filter(Boolean).join(", ")
}
