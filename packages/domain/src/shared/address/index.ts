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

/**
 * Multi-line address block:
 *   line 1: streetAddress
 *   line 2: "city, state postalCode"
 * Empty lines are dropped. Returns `""` if every field is blank.
 */
export function buildAddressBlock(address: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}): string {
  const cityLine = [address.city, address.state, address.postalCode]
    .filter((part) => Boolean(part) && String(part).trim() !== "")
    .map((part, index) => (index === 0 ? part : index === 1 ? `, ${part}` : ` ${part}`))
    .join("")
  const lines = [address.streetAddress, cityLine].filter((line) => Boolean(line) && String(line).trim() !== "")
  return lines.join("\n")
}
