export function normalizeAddressState(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
}

export function buildFullAddress(address: {
  streetAddress: string
  city: string
  state: string
  zip: string
}) {
  return [address.streetAddress, address.city, address.state, address.zip].filter(Boolean).join(", ")
}
