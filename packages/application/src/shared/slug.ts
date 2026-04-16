export function slugify(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (!normalized) {
    throw new Error("Cannot generate slug: input produces empty result after normalization")
  }
  return normalized
}

export async function generateUniqueSlug(
  name: string,
  slugExists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name)

  let candidate = base
  let suffix = 1
  while (await slugExists(candidate)) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }
  return candidate
}
